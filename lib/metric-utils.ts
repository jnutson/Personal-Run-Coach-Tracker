/**
 * Pure metric conversion utilities — no "use client", safe to import in server components.
 */

const MI_TO_KM = 1.60934;

export function miToKmLabel(mi: number): string {
  return `${(mi * MI_TO_KM).toFixed(1)} km`;
}

export function kmToMiLabel(km: number): string {
  return `${(km * 0.621371).toFixed(1)} mi`;
}

/**
 * Converts a pace string from /mi to /km.
 * Handles single paces ("6:52/mi") and ranges ("9:00–9:30/mi").
 */
export function paceToKmLabel(pacePerMi: string): string {
  const base = pacePerMi.replace("/mi", "").replace("/mile", "");
  const parts = base.split("–");

  const convert = (p: string) => {
    const [minStr, secStr] = p.trim().split(":");
    const totalSec = parseInt(minStr, 10) * 60 + parseInt(secStr, 10);
    const kmSec = totalSec / MI_TO_KM;
    const km_min = Math.floor(kmSec / 60);
    const km_sec = Math.round(kmSec % 60);
    return `${km_min}:${String(km_sec).padStart(2, "0")}`;
  };

  return parts.map(convert).join("–") + "/km";
}
