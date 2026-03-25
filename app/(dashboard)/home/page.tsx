/**
 * /home — Week in Review
 *
 * - AI summaries of last week + this week (cached 1h via page-level revalidate)
 * - Daily walking miles for the current week
 * - This week's full training schedule
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricHover } from "@/components/metric-hover";
import { createServiceClient } from "@/lib/supabase";
import { fmt, KM_TO_MI } from "@/lib/utils";
import { AcornIcon } from "@/components/acorn-icon";
import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval } from "date-fns";
import { PLAN_START } from "@/data/marathon-plan";
import { branding, marathon, health } from "@/config/user";

export const revalidate = 1800; // page ISR every 30 min

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  easy:      "bg-blue-100 text-blue-700",
  tempo:     "bg-amber-100 text-amber-700",
  long:      "bg-purple-100 text-purple-700",
  intervals: "bg-red-100 text-red-700",
  rest:      "bg-gray-100 text-gray-500",
  race:      "bg-green-100 text-green-700",
  bike:      "bg-cyan-100 text-cyan-700",
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function weekRange(offset = 0): { start: string; end: string; label: string } {
  const now = new Date();
  const ref = offset === 0 ? now : offset > 0 ? addWeeks(now, offset) : subWeeks(now, Math.abs(offset));
  const start = startOfWeek(ref, { weekStartsOn: 1 });
  const end   = endOfWeek(ref,   { weekStartsOn: 1 });
  return {
    start: format(start, "yyyy-MM-dd"),
    end:   format(end,   "yyyy-MM-dd"),
    label: `${format(start, "MMM d")}–${format(end, "MMM d")}`,
  };
}

// ── AI summaries ──────────────────────────────────────────────────────────────

// ── Summary generation (cached independently from the page) ──────────────────

type SummaryInput = {
  leftPlannedMi:  number;
  leftActualMi:   number;
  leftRunCount:   number;
  leftSessions:   number;
  avgMood:        number | null;
  avgEnergy:      number | null;
  rightMi:        number;
  rightSessions:  number;
  hardSessions:   string;
  planPhase:      string;
  planWeekNum:    number;
  leftLabel:      string;
  rightLabel:     string;
  isSunday:       boolean;
};

async function callClaude(input: SummaryInput): Promise<{ lastWeek: string; thisWeek: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const leftLabel  = input.isSunday ? `THIS WEEK — wrapping up (${input.leftLabel})` : `LAST WEEK (${input.leftLabel})`;
  const rightLabel = input.isSunday ? `NEXT WEEK — looking ahead (${input.rightLabel})` : `THIS WEEK (${input.rightLabel})`;
  const leftInstruction  = input.isSunday
    ? "2-3 sentences. Today is Sunday — the week is done. Lead with the biggest win or honest takeaway from the full week."
    : "2-3 sentences. Lead with biggest win or honest takeaway. Acknowledge shortfalls briefly but constructively.";
  const rightInstruction = input.isSunday
    ? "2-3 sentences. Preview next week. Call out the key session. One concrete tip to set up a strong week."
    : "2-3 sentences. Preview the week. Call out the key session. One concrete tip.";

  const prompt = `You are ${branding.userName}'s marathon training coach writing two short summaries for their weekly dashboard.

CONTEXT:
- Training for ${marathon.raceName} (${marathon.raceDate}) · A-goal: ${marathon.goalTime}
- Plan phase: ${input.planPhase}, Week ${input.planWeekNum} of 30
- Run clubs: ${marathon.runClubs.join(", ")}

${leftLabel}:
- Planned: ${fmt(input.leftPlannedMi, 1)} mi across ${input.leftSessions} sessions
- Actual: ${fmt(input.leftActualMi, 1)} mi across ${input.leftRunCount} runs
- Avg mood: ${input.avgMood ? fmt(input.avgMood, 1) + "/10" : "not recorded"}, avg energy: ${input.avgEnergy ? fmt(input.avgEnergy, 1) + "/10" : "not recorded"}

${rightLabel}:
- Planned: ${fmt(input.rightMi, 1)} mi across ${input.rightSessions} sessions
- Key sessions: ${input.hardSessions || "recovery week — no hard sessions"}

Write exactly two summaries as JSON:
{"lastWeek":"<${leftInstruction}>","thisWeek":"<${rightInstruction}>"}

Rules: plain English only, no markdown, no bullet points, warm coach tone.`;

  const anthropic = new Anthropic({ apiKey });

  // Race against a 12s timeout so ISR doesn't hang
  const messagePromise = anthropic.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages:   [{ role: "user", content: prompt }],
  });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Claude timeout")), 12000)
  );
  const response = await Promise.race([messagePromise, timeoutPromise]);

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in response");

  const parsed = JSON.parse(match[0]);
  return {
    lastWeek: parsed.lastWeek ?? "Summary unavailable.",
    thisWeek: parsed.thisWeek ?? "Summary unavailable.",
  };
}

// Cache keyed by week start — refreshes each new week automatically
const getCachedSummaries = unstable_cache(
  callClaude,
  ["week-summaries"],
  { revalidate: 3600 }
);

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchPageData() {
  const db        = createServiceClient();
  const isSunday  = new Date().getDay() === 0;
  const stepsWeek = weekRange(0);                        // steps card always = current Mon–Sun
  const leftWeek  = isSunday ? weekRange(0)  : weekRange(-1); // left card: closing week
  const rightWeek = isSunday ? weekRange(1)  : weekRange(0);  // right card: upcoming week

  const [rightPlanRes, leftPlanRes, leftRunsRes, leftCheckinsRes, stepsRes] =
    await Promise.all([
      db.from("training_plan")
        .select("plan_date, workout_type, target_distance_km, target_pace_desc, completed")
        .gte("plan_date", rightWeek.start)
        .lte("plan_date", rightWeek.end)
        .order("plan_date"),

      db.from("training_plan")
        .select("workout_type, target_distance_km")
        .gte("plan_date", leftWeek.start)
        .lte("plan_date", leftWeek.end),

      db.from("garmin_activities")
        .select("distance_km")
        .in("activity_type", ["run", "running"])
        .gte("activity_date", leftWeek.start)
        .lte("activity_date", leftWeek.end),

      (db.from("daily_checkin") as any)
        .select("mood, energy")
        .gte("date", leftWeek.start)
        .lte("date", leftWeek.end),

      db.from("garmin_daily")
        .select("date, steps")
        .gte("date", stepsWeek.start)
        .lte("date", stepsWeek.end)
        .order("date"),
    ]);

  return {
    isSunday,
    rightWeekPlan:    (rightPlanRes.data  ?? []) as any[],
    rightWeekLabel:   rightWeek.label,
    rightWeekStart:   rightWeek.start,
    rightWeekEnd:     rightWeek.end,
    leftWeekPlan:     (leftPlanRes.data   ?? []) as any[],
    leftWeekRuns:     (leftRunsRes.data   ?? []) as any[],
    leftWeekCheckins: (leftCheckinsRes.data ?? []) as { mood: number | null; energy: number | null }[],
    leftWeekLabel:    leftWeek.label,
    stepsWeekStart:   stepsWeek.start,
    stepsWeekEnd:     stepsWeek.end,
    stepsWeekDaily:   (stepsRes.data ?? []) as { date: string; steps: number | null }[],
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const data = await fetchPageData();

  // Plan week / phase (PLAN_START imported from data/marathon-plan → config/user)
  const today       = new Date();
  const daysIntoPlan = Math.floor((today.getTime() - PLAN_START.getTime()) / (1000 * 60 * 60 * 24));
  const planWeekNum  = Math.max(1, Math.min(30, Math.floor(daysIntoPlan / 7) + 1));
  const planPhase    =
    daysIntoPlan < 0   ? "Pre-plan" :
    planWeekNum <= 6   ? "Base" :
    planWeekNum <= 14  ? "Build" :
    planWeekNum <= 16  ? "Peak" : "Taper";

  const leftPlannedMi = (data.leftWeekPlan as any[]).reduce((s: number, r: any) => s + (r.target_distance_km ?? 0) * KM_TO_MI, 0);
  const leftActualMi  = (data.leftWeekRuns  as any[]).reduce((s: number, r: any) => s + (r.distance_km ?? 0) * KM_TO_MI, 0);
  const moodEntries    = data.leftWeekCheckins.filter(c => c.mood != null);
  const energyEntries  = data.leftWeekCheckins.filter(c => c.energy != null);
  const avgMood   = moodEntries.length   ? moodEntries.reduce((s, c) => s + c.mood!, 0) / moodEntries.length : null;
  const avgEnergy = energyEntries.length ? energyEntries.reduce((s, c) => s + c.energy!, 0) / energyEntries.length : null;
  const hardSessions = (data.rightWeekPlan as any[])
    .filter((w: any) => ["tempo","intervals","long","race"].includes(w.workout_type))
    .map((s: any) => `${s.workout_type} (${fmt((s.target_distance_km ?? 0) * KM_TO_MI, 1)} mi)`)
    .join(", ");

  const summaryInput: SummaryInput = {
    leftPlannedMi,
    leftActualMi,
    leftRunCount:   data.leftWeekRuns.length,
    leftSessions:   (data.leftWeekPlan as any[]).filter((w: any) => w.workout_type !== "rest").length,
    avgMood,
    avgEnergy,
    rightMi:        (data.rightWeekPlan as any[]).reduce((s: number, r: any) => s + (r.target_distance_km ?? 0) * KM_TO_MI, 0),
    rightSessions:  (data.rightWeekPlan as any[]).filter((w: any) => w.workout_type !== "rest").length,
    hardSessions,
    planPhase,
    planWeekNum,
    leftLabel:  data.leftWeekLabel,
    rightLabel: data.rightWeekLabel,
    isSunday:   data.isSunday,
  };

  // Fetch summaries — cache miss calls Claude; errors show a soft fallback (not cached)
  let summaries: { lastWeek: string; thisWeek: string };
  try {
    summaries = await getCachedSummaries(summaryInput);
  } catch {
    summaries = {
      lastWeek: "Coach summary loading — check back in a moment.",
      thisWeek: "Coach summary loading — check back in a moment.",
    };
  }

  const rightWeekRuns    = data.rightWeekPlan.filter(w => w.workout_type !== "rest");
  const rightWeekTotalMi = data.rightWeekPlan.reduce((s, r) => s + ((r as any).target_distance_km ?? 0) * KM_TO_MI, 0);

  // Build Mon–Sun day array for the walking card (always current week)
  const weekStart = new Date(data.stepsWeekStart + "T12:00:00");
  const weekEnd   = new Date(data.stepsWeekEnd   + "T12:00:00");
  const weekDays  = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const stepsByDate = Object.fromEntries(
    data.stepsWeekDaily.map(d => [d.date, d.steps])
  );
  const STEPS_PER_MILE = 2000;

  // Sunday-aware UI labels
  const leftCardTitle  = data.isSunday ? "← This Week" : "← Last Week";
  const rightCardTitle = data.isSunday ? "Next Week →"  : "This Week Ahead →";
  const scheduleTitle  = data.isSunday ? "Next Week's Schedule" : "This Week's Schedule";

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <AcornIcon size={16} className="text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Week in Review</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.leftWeekLabel} · {data.rightWeekLabel}
          </p>
        </div>
      </div>

      {/* ── AI summary cards ──────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{leftCardTitle}</CardTitle>
              <span className="text-xs text-muted-foreground">{data.leftWeekLabel}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed">{summaries.lastWeek}</p>
            {data.leftWeekRuns.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Actual miles</p>
                  <p className="text-lg font-mono font-semibold text-foreground">
                    <MetricHover metric={`${data.leftWeekRuns.reduce((s, r) => s + ((r as any).distance_km ?? 0), 0).toFixed(1)} km`}>
                      {data.leftWeekRuns.reduce((s, r) => s + ((r as any).distance_km ?? 0) * KM_TO_MI, 0).toFixed(1)} mi
                    </MetricHover>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Runs logged</p>
                  <p className="text-lg font-mono font-semibold text-foreground">{data.leftWeekRuns.length}</p>
                </div>
              </div>
            )}
            {data.leftWeekRuns.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground italic">No runs synced yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{rightCardTitle}</CardTitle>
              <span className="text-xs text-muted-foreground">{data.rightWeekLabel}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed">{summaries.thisWeek}</p>
            {rightWeekTotalMi > 0 && (
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Planned miles</p>
                  <p className="text-lg font-mono font-semibold text-foreground">
                    <MetricHover metric={`${(rightWeekTotalMi / KM_TO_MI).toFixed(1)} km`}>
                      {rightWeekTotalMi.toFixed(1)} mi
                    </MetricHover>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessions planned</p>
                  <p className="text-lg font-mono font-semibold text-foreground">{rightWeekRuns.length}</p>
                </div>
              </div>
            )}
            {data.rightWeekPlan.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground italic">No plan loaded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Daily steps / walking this week ───────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Daily Steps This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const steps   = stepsByDate[dateStr] ?? null;
              const miles   = steps != null ? steps / STEPS_PER_MILE : null;
              const isToday = dateStr === format(today, "yyyy-MM-dd");
              const isFuture = day > today;
              const pct = steps ? Math.min(100, (steps / health.dailyStepGoal) * 100) : 0;

              return (
                <div
                  key={dateStr}
                  className={[
                    "flex flex-col items-center gap-1.5 rounded-lg p-2",
                    isToday ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/30",
                  ].join(" ")}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {format(day, "EEE")}
                  </span>
                  {/* Bar */}
                  <div className="w-full h-16 bg-muted rounded flex flex-col justify-end overflow-hidden">
                    {!isFuture && steps != null && (
                      <div
                        className="w-full rounded bg-blue-400 transition-all"
                        style={{ height: `${pct}%` }}
                      />
                    )}
                  </div>
                  {/* Steps */}
                  <span className="text-xs tabular-nums text-foreground font-mono">
                    {isFuture ? "—" : steps != null ? `${(steps / 1000).toFixed(1)}k` : "—"}
                  </span>
                  {/* Miles */}
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {!isFuture && miles != null ? `${miles.toFixed(1)} mi` : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Bar fills at {health.dailyStepGoal.toLocaleString()} steps. Miles ≈ steps ÷ 2,000 (avg stride).
          </p>
        </CardContent>
      </Card>

      {/* ── This week's full schedule ──────────────────────────── */}
      {data.rightWeekPlan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{scheduleTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div>
              {data.rightWeekPlan.map((w) => {
                const dayStr = format(new Date((w as any).plan_date + "T12:00:00"), "EEEE");
                const dateStr = format(new Date((w as any).plan_date + "T12:00:00"), "MMM d");
                const isRest = w.workout_type === "rest";
                const mi = (w as any).target_distance_km ? (w as any).target_distance_km * KM_TO_MI : null;

                return (
                  <div
                    key={(w as any).plan_date}
                    className={[
                      "flex items-center gap-4 px-6 py-3.5 border-b border-border last:border-0",
                      (w as any).completed ? "opacity-40" : "",
                    ].join(" ")}
                  >
                    <div className="w-28 shrink-0">
                      <p className="text-sm font-medium text-foreground">{dayStr}</p>
                      <p className="text-xs text-muted-foreground">{dateStr}</p>
                    </div>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${WORKOUT_TYPE_COLORS[w.workout_type] ?? "bg-muted text-muted-foreground"}`}>
                      {w.workout_type}
                    </span>
                    <div className="flex-1 min-w-0">
                      {(w as any).target_pace_desc && (
                        <p className="text-sm text-foreground truncate">{(w as any).target_pace_desc}</p>
                      )}
                      {isRest && !(w as any).target_pace_desc && (
                        <p className="text-sm text-muted-foreground">Rest day</p>
                      )}
                    </div>
                    {mi && (
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground font-mono">
                        <MetricHover metric={`${(w as any).target_distance_km.toFixed(1)} km`}>
                          {mi.toFixed(1)} mi
                        </MetricHover>
                      </span>
                    )}
                    {(w as any).completed && (
                      <span className="shrink-0 text-xs text-muted-foreground">✓ done</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data.rightWeekPlan.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No training plan loaded for this week.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Run migration 007 in Supabase to populate the plan.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
