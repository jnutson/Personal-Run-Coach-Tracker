import { createServiceClient } from "@/lib/supabase";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { SleepCharts } from "./sleep-charts";
import { fmt, fmtSleep, fmtSleepPadded, scoreColor, hrvColor } from "@/lib/utils";
import type { GarminDaily } from "@/lib/types";
import { subDays, format } from "date-fns";
import { health } from "@/config/user";

export const revalidate = 3600;

async function getData() {
  const db = createServiceClient();
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const { data } = await db
    .from("garmin_daily")
    .select("*")
    .gte("date", thirtyDaysAgo)
    .order("date", { ascending: true });

  return (data ?? []) as GarminDaily[];
}

export default async function SleepPage() {
  const daily = await getData();
  const latest = daily[daily.length - 1];
  const sevenDay = daily.slice(-7);

  const avgSleep = sevenDay.filter((d) => d.sleep_duration).reduce((s, d) => s + (d.sleep_duration ?? 0), 0) / (sevenDay.filter((d) => d.sleep_duration).length || 1);
  const avgSleepScore = sevenDay.filter((d) => d.sleep_score).reduce((s, d) => s + (d.sleep_score ?? 0), 0) / (sevenDay.filter((d) => d.sleep_score).length || 1);
  const avgSteps = sevenDay.filter((d) => d.steps).reduce((s, d) => s + (d.steps ?? 0), 0) / (sevenDay.filter((d) => d.steps).length || 1);

  // Recent nights in reverse order (newest first) for the log
  const recentNights = [...daily].reverse().slice(0, 14);

  return (
    <div>
      <SectionHeader title="Sleep & Health" subtitle="Garmin data · 30-day trend" />

      {daily.length === 0 ? (
        <EmptyState message="No Garmin data synced yet. Run the sync script to populate data." />
      ) : (
        <>
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Sleep (7d avg)"
              value={fmtSleep(avgSleep)}
              sub="duration"
              valueClass={avgSleep >= health.sleepThresholds.positiveHours ? "text-positive" : avgSleep >= health.sleepThresholds.warningHours ? "text-warning" : "text-negative"}
              hint="Average nightly sleep duration over the past 7 days. 7–9 hours is optimal for endurance athletes. Chronic sleep debt directly impairs running economy, mood, and injury resilience."
            />
            <StatCard
              title="Sleep Score (7d)"
              value={avgSleepScore ? fmt(avgSleepScore, 0) : "—"}
              sub="out of 100"
              valueClass={scoreColor(avgSleepScore)}
              hint="Garmin's sleep quality score (0–100), factoring in duration, sleep stages (light/deep/REM), and restlessness. 70+ is solid. Below 60 for multiple nights warrants extra recovery attention."
            />
            <StatCard
              title="Body Battery"
              value={latest?.body_battery_start ? `${latest.body_battery_start} → ${latest.body_battery_end ?? "?"}` : "—"}
              sub="start → end of day"
              valueClass="text-accent"
              hint="Garmin's 0–100 energy reserve estimate, computed from HRV, stress, and sleep quality. 75+ means you're ready to train hard. Below 40 is a strong signal to keep the day easy. Shows start of day → end of day."
            />
            <StatCard
              title="HRV (latest)"
              value={latest?.hrv ? fmt(latest.hrv, 0) + " ms" : "—"}
              valueClass={hrvColor(latest?.hrv)}
              hint="Heart Rate Variability — variation in milliseconds between heartbeats, measured overnight. Higher = better recovery. A sustained 10%+ drop over multiple days signals accumulated fatigue or illness. Best tracked as a personal trend, not an absolute number."
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Resting HR"
              value={latest?.resting_hr ? `${latest.resting_hr} bpm` : "—"}
              sub="latest"
              hint="Resting heart rate (beats per minute) measured at rest, typically overnight. Lower generally indicates better cardiovascular fitness. An elevated RHR of 5+ bpm above your personal norm is a reliable signal of fatigue, stress, or oncoming illness."
            />
            <StatCard
              title="Steps (7d avg)"
              value={avgSteps ? Math.round(avgSteps).toLocaleString() : "—"}
              valueClass={avgSteps >= 10000 ? "text-positive" : "text-foreground"}
              hint="Average daily step count over the past 7 days. Steps are a proxy for overall movement and low-level aerobic activity. 7,000–10,000+ supports active recovery on easy days without adding structured training stress."
            />
            <StatCard
              title="Steps (today)"
              value={latest?.steps ? latest.steps.toLocaleString() : "—"}
              hint="Total steps recorded today by your Garmin. Includes all movement, not just runs."
            />
          </div>

          {/* Sleep log */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recent Sleep Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left font-medium pb-2 pr-4">Date</th>
                      <th className="text-right font-medium pb-2 px-3">Duration</th>
                      <th className="text-right font-medium pb-2 px-3">Score</th>
                      <th className="text-right font-medium pb-2 px-3">Battery</th>
                      <th className="text-right font-medium pb-2 px-3">RHR</th>
                      <th className="text-right font-medium pb-2 px-3">HRV</th>
                      <th className="text-right font-medium pb-2 pl-3">Steps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentNights.map((d) => (
                      <tr key={d.date} className="border-b border-border last:border-0">
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                          {format(new Date(d.date + "T12:00:00"), "EEEE, M/d")}
                        </td>
                        <td className={`py-2.5 px-3 text-right tabular-nums font-mono text-xs ${d.sleep_duration ? scoreColor(d.sleep_duration >= health.sleepThresholds.positiveHours ? 80 : d.sleep_duration >= health.sleepThresholds.warningHours ? 55 : 30) : "text-muted-foreground"}`}>
                          {fmtSleepPadded(d.sleep_duration)}
                        </td>
                        <td className={`py-2.5 px-3 text-right tabular-nums ${scoreColor(d.sleep_score)}`}>
                          {d.sleep_score ?? "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {d.body_battery_start != null
                            ? `${d.body_battery_start}→${d.body_battery_end ?? "?"}`
                            : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {d.resting_hr ? `${d.resting_hr}` : "—"}
                        </td>
                        <td className={`py-2.5 px-3 text-right tabular-nums ${hrvColor(d.hrv)}`}>
                          {d.hrv ? fmt(d.hrv, 0) : "—"}
                        </td>
                        <td className="py-2.5 pl-3 text-right tabular-nums text-muted-foreground">
                          {d.steps ? d.steps.toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <SleepCharts daily={daily} />
        </>
      )}
    </div>
  );
}
