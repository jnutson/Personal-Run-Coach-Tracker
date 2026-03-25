import { createServiceClient } from "@/lib/supabase";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { GoalsCharts } from "./goals-charts";
import { HabitHeatmap } from "./habit-heatmap";
import type { DailyCheckin, WeeklySummary } from "@/lib/types";
import { subDays, format } from "date-fns";

export const revalidate = 1800;

async function getData() {
  const db = createServiceClient();
  const ninetyDaysAgo = format(subDays(new Date(), 90), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const [checkinsRes, summariesRes] = await Promise.all([
    db.from("daily_checkin").select("*").gte("date", ninetyDaysAgo).order("date", { ascending: false }),
    db.from("weekly_summaries").select("*").order("week_start", { ascending: false }).limit(4),
  ]);

  return {
    checkins: (checkinsRes.data ?? []) as DailyCheckin[],
    summaries: (summariesRes.data ?? []) as WeeklySummary[],
  };
}

export default async function GoalsPage() {
  const { checkins, summaries } = await getData();

  const latest = checkins[0];
  const sevenDay = checkins.slice(0, 7);

  const avgEnergy  = sevenDay.filter((d) => d.energy).reduce((s, d) => s + (d.energy ?? 0), 0) / (sevenDay.filter((d) => d.energy).length || 1);
  const avgMood    = sevenDay.filter((d) => d.mood).reduce((s, d) => s + (d.mood ?? 0), 0) / (sevenDay.filter((d) => d.mood).length || 1);
  const avgMH      = sevenDay.filter((d) => d.mental_health).reduce((s, d) => s + (d.mental_health ?? 0), 0) / (sevenDay.filter((d) => d.mental_health).length || 1);

  const exerciseDays = sevenDay.filter((d) => d.exercise).length;
  const meditateDays = sevenDay.filter((d) => d.meditate).length;
  const stretchDays  = sevenDay.filter((d) => d.stretch).length;

  function scoreClass(v: number): string {
    if (v >= 7) return "text-positive";
    if (v >= 5) return "text-warning";
    return "text-negative";
  }

  return (
    <div>
      <SectionHeader title="Goals" subtitle="Daily check-ins · habit tracking" />

      {checkins.length === 0 ? (
        <EmptyState message="No check-ins yet. The Telegram bot will populate data nightly." />
      ) : (
        <>
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Energy (7d avg)"
              value={avgEnergy ? avgEnergy.toFixed(1) : "—"}
              sub="out of 10"
              valueClass={scoreClass(avgEnergy)}
            />
            <StatCard
              title="Mood (7d avg)"
              value={avgMood ? avgMood.toFixed(1) : "—"}
              sub="out of 10"
              valueClass={scoreClass(avgMood)}
            />
            <StatCard
              title="Mental Health (7d avg)"
              value={avgMH ? avgMH.toFixed(1) : "—"}
              sub="out of 10"
              valueClass={scoreClass(avgMH)}
            />
            <div className="grid grid-rows-3 gap-1">
              {[
                { label: "Exercise", days: exerciseDays },
                { label: "Meditate", days: meditateDays },
                { label: "Stretch",  days: stretchDays  },
              ].map(({ label, days }) => (
                <div key={label} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className={`text-xs font-semibold ${days >= 5 ? "text-positive" : days >= 3 ? "text-warning" : "text-negative"}`}>
                    {days}/7
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Habit heatmap */}
          <HabitHeatmap checkins={checkins} />

          {/* Survey trends */}
          <GoalsCharts checkins={checkins} />

          {/* Latest weekly AI summary */}
          {summaries.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Weekly AI Summary — {format(new Date(summaries[0].week_start + "T12:00:00"), "MMM d, yyyy")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {summaries[0].summary_text}
                </p>
              </CardContent>
            </Card>
          )}

        </>
      )}
    </div>
  );
}
