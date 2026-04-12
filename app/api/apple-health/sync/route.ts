/**
 * POST /api/apple-health/sync
 *
 * Called by the "Health Auto Export" iOS app (or an Apple Shortcut) on a daily schedule.
 * Accepts Health Auto Export's REST API payload and maps it to the existing
 * garmin_daily + garmin_activities Supabase tables.
 *
 * Auth: Bearer token via SYNC_SECRET env var (same secret used by the Python scripts).
 *
 * Health Auto Export setup:
 *   - URL: https://your-app.vercel.app/api/apple-health/sync
 *   - Method: POST
 *   - Header: Authorization: Bearer <SYNC_SECRET>
 *   - Metrics to include: Step Count, Resting Heart Rate, Heart Rate Variability,
 *     Sleep Analysis, VO2 Max
 *   - Workouts: enabled
 *   - Export range: Last 2 days (covers today + yesterday)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// ── Health Auto Export metric names ──────────────────────────────────────────

const METRIC = {
  steps:       "step_count",
  restingHr:   "resting_heart_rate",
  hrv:         "heart_rate_variability",
  sleep:       "sleep_analysis",
  vo2max:      "vo2_max",
} as const;

// ── Types for Health Auto Export payload ─────────────────────────────────────

interface HaeMetricEntry {
  date: string;         // "2026-04-12" or "2026-04-12 00:00:00 -0700"
  qty?: number;         // most metrics
  asleep?: number;      // sleep_analysis — hours asleep
  inBed?: number;       // sleep_analysis — hours in bed
}

interface HaeMetric {
  name: string;
  units: string;
  data: HaeMetricEntry[];
}

interface HaeWorkout {
  name: string;
  start: string;        // "2026-04-12 07:00:00 -0700"
  end: string;
  duration: string;     // "60.5 min"
  distance?: number;
  distance_unit?: string;
  energy?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationAscended?: number;
}

interface HaePayload {
  data: {
    metrics?: HaeMetric[];
    workouts?: HaeWorkout[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise "2026-04-12 07:00:00 -0700" → "2026-04-12" */
function toDateStr(raw: string): string {
  return raw.trim().slice(0, 10);
}

/** Parse "60.5 min" → seconds */
function durationToSec(raw: string): number | null {
  const match = raw.match(/([\d.]+)\s*min/i);
  return match ? Math.round(parseFloat(match[1]) * 60) : null;
}

/** Convert distance to km */
function toKm(distance: number | undefined, unit: string | undefined): number | null {
  if (distance == null) return null;
  if (!unit || unit === "km") return distance;
  if (unit === "mi")  return distance * 1.60934;
  return distance;
}

/** Build a map of date → value from a metric's data array */
function indexByDate(data: HaeMetricEntry[]): Map<string, HaeMetricEntry> {
  const map = new Map<string, HaeMetricEntry>();
  for (const entry of data) {
    const d = toDateStr(entry.date);
    // Last write wins — fine for daily aggregates
    map.set(d, entry);
  }
  return map;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const validSecret = process.env.SYNC_SECRET;
  if (auth !== `Bearer ${validSecret}` && querySecret !== validSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: HaePayload = await req.json();
  const { metrics = [], workouts = [] } = body.data ?? {};

  // Index each metric by date for easy lookup
  const byName = new Map<string, Map<string, HaeMetricEntry>>();
  for (const metric of metrics) {
    byName.set(metric.name, indexByDate(metric.data));
  }

  const steps      = byName.get(METRIC.steps);
  const restingHr  = byName.get(METRIC.restingHr);
  const hrv        = byName.get(METRIC.hrv);
  const sleep      = byName.get(METRIC.sleep);
  const vo2max     = byName.get(METRIC.vo2max);

  // Collect all unique dates across all metrics
  const allDates = new Set<string>([
    ...steps?.keys()     ?? [],
    ...restingHr?.keys() ?? [],
    ...hrv?.keys()       ?? [],
    ...sleep?.keys()     ?? [],
    ...vo2max?.keys()    ?? [],
  ]);

  // Build garmin_daily rows
  const dailyRows = Array.from(allDates).map((date) => ({
    date,
    steps:         steps?.get(date)?.qty    ?? null,
    resting_hr:    restingHr?.get(date)?.qty ?? null,
    hrv:           hrv?.get(date)?.qty       ?? null,
    sleep_duration: (() => {
      const s = sleep?.get(date);
      if (!s) return null;
      // Prefer explicit asleep value; fall back to inBed
      return s.asleep ?? s.inBed ?? s.qty ?? null;
    })(),
    vo2max: vo2max?.get(date)?.qty ?? null,
    // Garmin-specific fields not available from Apple Health
    sleep_score:        null,
    training_load:      null,
    body_battery_start: null,
    body_battery_end:   null,
    wear_hours:         null,
  }));

  // Build garmin_activities rows from workouts
  // Use a hash of start time as a stable ID (no Garmin ID available)
  const activityRows = workouts.map((w) => {
    const startDate = toDateStr(w.start);
    const distKm    = toKm(w.distance, w.distance_unit);
    const durSec    = durationToSec(w.duration);
    const avgPace   = distKm && durSec && distKm > 0
      ? Math.round(durSec / distKm)
      : null;

    // Stable pseudo-ID: hash of start timestamp string
    const pseudoId = hashStr(w.start);

    return {
      garmin_id:       pseudoId,
      activity_date:   startDate,
      activity_type:   normaliseWorkoutType(w.name),
      name:            w.name,
      distance_km:     distKm,
      duration_sec:    durSec,
      avg_hr:          w.avgHeartRate    ?? null,
      max_hr:          w.maxHeartRate    ?? null,
      avg_pace_sec_km: avgPace,
      elevation_m:     w.elevationAscended ?? null,
      calories:        w.energy          ?? null,
    };
  });

  const db = createServiceClient();
  const errors: string[] = [];

  if (dailyRows.length > 0) {
    const { error } = await (db.from("garmin_daily") as any)
      .upsert(dailyRows, { onConflict: "date" });
    if (error) errors.push(`daily: ${error.message}`);
  }

  if (activityRows.length > 0) {
    const { error } = await (db.from("garmin_activities") as any)
      .upsert(activityRows, { onConflict: "garmin_id" });
    if (error) errors.push(`activities: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    daily: dailyRows.length,
    activities: activityRows.length,
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Simple deterministic integer hash of a string — used as a stable workout ID */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Map Apple Health workout names to our activity_type values */
function normaliseWorkoutType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("run"))    return "running";
  if (n.includes("walk"))   return "walking";
  if (n.includes("cycle") || n.includes("bike") || n.includes("cycling")) return "cycling";
  if (n.includes("swim"))   return "swimming";
  if (n.includes("hike"))   return "hiking";
  return n.replace(/\s+/g, "_");
}
