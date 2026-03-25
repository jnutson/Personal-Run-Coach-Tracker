import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { health } from "@/config/user";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(n: number | null | undefined, decimals = 1): string {
  if (n == null) return "—";
  return n.toFixed(decimals);
}

// ── Distance / pace ──────────────────────────────────────────────────────────

export const KM_TO_MI = 0.621371;

/** Convert km to miles string, e.g. "6.21" */
export function fmtMiles(km: number | null | undefined, decimals = 2): string {
  if (km == null) return "—";
  return (km * KM_TO_MI).toFixed(decimals);
}

/** Pace per mile from seconds-per-km, e.g. "9:45 /mi" */
export function fmtPaceMi(secPerKm: number | null | undefined): string {
  if (!secPerKm) return "—";
  const secPerMi = secPerKm / KM_TO_MI;
  const m = Math.floor(secPerMi / 60);
  const s = Math.round(secPerMi % 60);
  return `${m}:${s.toString().padStart(2, "0")} /mi`;
}

/** Pace per km from seconds-per-km, e.g. "6:03 /km" */
export function fmtPace(secPerKm: number | null | undefined): string {
  if (!secPerKm) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

// ── Duration / sleep ─────────────────────────────────────────────────────────

export function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Sleep duration — standard display, e.g. "7h 30m" */
export function fmtSleep(hours: number | null | undefined): string {
  if (!hours) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

/** Sleep duration — zero-padded log format, e.g. "07h59m" */
export function fmtSleepPadded(hours: number | null | undefined): string {
  if (!hours) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m`;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-positive";
  if (score >= 40) return "text-warning";
  return "text-negative";
}

export function hrvColor(hrv: number | null | undefined): string {
  if (hrv == null) return "text-muted-foreground";
  if (hrv >= health.hrvThresholds.positive) return "text-positive";
  if (hrv >= health.hrvThresholds.warning)  return "text-warning";
  return "text-negative";
}
