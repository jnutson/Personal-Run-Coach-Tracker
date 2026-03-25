import { createServiceClient } from "@/lib/supabase";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { TrainingCharts } from "./training-charts";
import { TrainingPlanTable } from "./training-plan-table";
import { fmt, fmtMiles, fmtPaceMi, fmtPace, fmtDuration, hrvColor, KM_TO_MI } from "@/lib/utils";
import type { GarminDaily, GarminActivity, TrainingPlan } from "@/lib/types";
import { subDays, format, startOfWeek, endOfWeek } from "date-fns";

export const revalidate = 3600;

async function getData() {
  const db = createServiceClient();
  const today = new Date();
  const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [dailyRes, activitiesRes, planRes, recentPlanRes] = await Promise.all([
    db.from("garmin_daily").select("*").gte("date", thirtyDaysAgo).order("date", { ascending: true }),
    db.from("garmin_activities").select("*").gte("activity_date", thirtyDaysAgo).order("activity_date", { ascending: false }),
    db.from("training_plan").select("*").gte("plan_date", weekStart).lte("plan_date", weekEnd).order("plan_date"),
    db.from("training_plan").select("*").gte("plan_date", format(today, "yyyy-MM-dd")).order("plan_date").limit(14),
  ]);

  return {
    daily: (dailyRes.data ?? []) as GarminDaily[],
    activities: (activitiesRes.data ?? []) as GarminActivity[],
    thisWeekPlan: (planRes.data ?? []) as TrainingPlan[],
    upcomingPlan: (recentPlanRes.data ?? []) as TrainingPlan[],
  };
}

export default async function TrainingPage() {
  const { daily, activities, thisWeekPlan, upcomingPlan } = await getData();

  const latest = daily[daily.length - 1];
  const sevenDay = daily.slice(-7);

  // Weekly mileage: sum run distances for this week
  const weekRuns = activities.filter((a) => a.activity_type === "running" || a.activity_type === "run");
  const thisWeekKm = weekRuns.reduce((s, a) => s + (a.distance_km ?? 0), 0);
  const plannedWeekKm = thisWeekPlan.reduce((s, p) => s + (p.target_distance_km ?? 0), 0);
  const thisWeekMi = thisWeekKm * KM_TO_MI;
  const plannedWeekMi = plannedWeekKm * KM_TO_MI;

  // Avg HRV last 7 days
  const avgHrv = sevenDay.filter((d) => d.hrv).reduce((s, d) => s + (d.hrv ?? 0), 0) / (sevenDay.filter((d) => d.hrv).length || 1);

  // Training load vs recovery risk
  const trainingLoad = latest?.training_load;
  const overtrained = trainingLoad && trainingLoad > 300;

  // Recent runs only (for the runs list)
  const recentRuns = activities.filter(
    (a) => a.activity_type === "running" || a.activity_type === "run"
  ).slice(0, 8);

  const workoutTypeColors: Record<string, string> = {
    easy:      "bg-blue-100 text-blue-700",
    tempo:     "bg-amber-100 text-amber-700",
    long:      "bg-purple-100 text-purple-700",
    intervals: "bg-red-100 text-red-700",
    rest:      "bg-gray-100 text-gray-500",
    race:      "bg-green-100 text-green-700",
  };

  return (
    <div>
      <SectionHeader
        title="Training"
        subtitle="Garmin data · marathon plan · load overview"
      />

      {/* Overtraining alert */}
      {overtrained && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠ High training load ({fmt(trainingLoad, 0)}). Consider an easy day.
        </div>
      )}

      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Weekly miles"
          value={`${fmt(thisWeekMi, 1)} / ${fmt(plannedWeekMi, 1)}`}
          sub="actual vs planned"
          valueClass={thisWeekMi >= plannedWeekMi ? "text-positive" : "text-foreground"}
          hint="Total run miles this week vs the training plan target. Shown as actual / planned."
        />
        <StatCard
          title="VO2 Max"
          value={latest?.vo2max ? fmt(latest.vo2max, 1) : "—"}
          sub="ml/kg/min"
          valueClass="text-accent"
          hint="VO2 max is your maximal oxygen uptake — how efficiently your body uses oxygen during hard effort. Higher is better. Improves gradually through consistent training. Elite marathoners typically exceed 65 ml/kg/min."
        />
        <StatCard
          title="HRV (7d avg)"
          value={avgHrv ? fmt(avgHrv, 0) + " ms" : "—"}
          valueClass={hrvColor(avgHrv)}
          hint="Heart Rate Variability — the variation in milliseconds between heartbeats. Higher HRV signals better recovery and readiness. A sustained drop of 10%+ over several days indicates accumulated fatigue. Best measured first thing in the morning."
        />
        <StatCard
          title="Training Load"
          value={latest?.training_load ? fmt(latest.training_load, 0) : "—"}
          sub="acute load"
          valueClass={overtrained ? "text-negative" : "text-foreground"}
          hint="Garmin's 7-day rolling acute training load — a measure of recent workout stress. Low = undertrained. High (300+) = overreaching risk. Your chronic load (fitness) should rise gradually; sudden spikes increase injury risk."
        />
      </div>

      {/* Charts */}
      <TrainingCharts daily={daily} activities={activities} />

      {/* This week's plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>This Week&apos;s Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {thisWeekPlan.length === 0 ? (
            <EmptyState message="No plan for this week." />
          ) : (
            <div className="space-y-2">
              {thisWeekPlan.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-14 shrink-0">
                      {format(new Date(p.plan_date + "T12:00:00"), "EEE d")}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${workoutTypeColors[p.workout_type] ?? "bg-secondary text-secondary-foreground"}`}
                    >
                      {p.workout_type}
                    </span>
                    <span className="text-sm text-foreground">
                      {p.target_pace_desc}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.target_distance_km && (
                      <span
                        className="text-sm text-muted-foreground tabular-nums cursor-default"
                        title={`${fmt(p.target_distance_km, 1)} km`}
                      >
                        {fmt(p.target_distance_km * KM_TO_MI, 1)} mi
                      </span>
                    )}
                    <Badge variant={p.completed ? "positive" : "outline"}>
                      {p.completed ? "done" : "planned"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming plan (next 14 days) */}
      <TrainingPlanTable plan={upcomingPlan} />

      {/* Recent runs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <EmptyState message="No runs synced yet." />
          ) : (
            <div className="space-y-0">
              {recentRuns.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {format(new Date(a.activity_date + "T12:00:00"), "EEE, MMM d")}
                    </span>
                    <p className="text-sm font-medium">{a.name ?? "Run"}</p>
                  </div>
                  <div className="flex items-center gap-5 text-sm tabular-nums text-muted-foreground">
                    {a.distance_km && (
                      <span
                        className="cursor-default"
                        title={`${fmt(a.distance_km, 2)} km`}
                      >
                        {fmtMiles(a.distance_km)} mi
                      </span>
                    )}
                    {a.duration_sec && <span>{fmtDuration(a.duration_sec)}</span>}
                    {a.avg_pace_sec_km && (
                      <span
                        className="cursor-default"
                        title={fmtPace(a.avg_pace_sec_km)}
                      >
                        {fmtPaceMi(a.avg_pace_sec_km)}
                      </span>
                    )}
                    {a.avg_hr && <span>{a.avg_hr} bpm</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All recent activities */}
      <Card>
        <CardHeader>
          <CardTitle>All Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <EmptyState message="No activities synced yet. Run the sync script to populate data." />
          ) : (
            <div className="space-y-0">
              {activities.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {format(new Date(a.activity_date + "T12:00:00"), "MMM d")}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{a.name ?? a.activity_type}</p>
                      <p className="text-xs text-muted-foreground">{a.activity_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm tabular-nums text-muted-foreground">
                    {a.distance_km && (
                      <span
                        className="cursor-default"
                        title={`${fmt(a.distance_km, 2)} km`}
                      >
                        {fmtMiles(a.distance_km)} mi
                      </span>
                    )}
                    {a.duration_sec && <span>{fmtDuration(a.duration_sec)}</span>}
                    {a.avg_pace_sec_km && (
                      <span
                        className="cursor-default"
                        title={fmtPace(a.avg_pace_sec_km)}
                      >
                        {fmtPaceMi(a.avg_pace_sec_km)}
                      </span>
                    )}
                    {a.avg_hr && <span>{a.avg_hr} bpm</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
