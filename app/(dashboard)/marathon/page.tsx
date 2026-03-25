import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";
import { WeekPlanExplorer } from "./week-plan-explorer";
import type { WorkoutRow } from "./week-plan-explorer";
import { PlanTable } from "./plan-table";
import { MetricHover } from "@/components/metric-hover";
import { miToKmLabel, paceToKmLabel } from "@/lib/metric-utils";
import { createServiceClient } from "@/lib/supabase";
import { AcornIcon } from "@/components/acorn-icon";
import {
  planWeeks,
  PLAN_START,
  RACE_DATE,
  PHASE_BADGE,
} from "@/data/marathon-plan";
import { marathon } from "@/config/user";

const KM_TO_MI = 0.621371;

function getCurrentWeek(): number {
  const today = new Date();
  const diffMs = today.getTime() - PLAN_START.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

function getDaysToRace(): number {
  const today = new Date();
  return Math.ceil((RACE_DATE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysToStart(): number {
  const today = new Date();
  return Math.ceil((PLAN_START.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function MarathonPage() {
  const currentWeek = getCurrentWeek();
  const daysToRace  = getDaysToRace();
  const currentPlanWeek = planWeeks.find((w) => w.wk === currentWeek);

  const preStart = currentWeek < 1;
  const postRace = currentWeek > 30;

  const db = createServiceClient();

  // ── Actual miles per plan week (for the 30-week table) ─────────────────────
  const { data: runActivities } = await db
    .from("garmin_activities")
    .select("activity_date, distance_km")
    .in("activity_type", ["run", "running"])
    .gte("activity_date", toYMD(PLAN_START));

  const actualMiByWeek: Record<number, number> = {};
  for (const act of (runActivities ?? []) as any[]) {
    const actDate = new Date(act.activity_date + "T12:00:00");
    const diffDays = Math.floor(
      (actDate.getTime() - PLAN_START.getTime()) / (1000 * 60 * 60 * 24)
    );
    const wk = Math.floor(diffDays / 7) + 1;
    if (wk >= 1 && wk <= 30) {
      actualMiByWeek[wk] = (actualMiByWeek[wk] ?? 0) + (act.distance_km ?? 0) * KM_TO_MI;
    }
  }
  for (const wk in actualMiByWeek) {
    actualMiByWeek[wk] = Math.round(actualMiByWeek[wk] * 10) / 10;
  }

  // ── All 30 weeks of training plan rows (for the interactive explorer) ───────
  const { data: allPlanRows } = await db
    .from("training_plan")
    .select("plan_date, workout_type, target_distance_km, target_pace_desc, completed")
    .gte("plan_date", toYMD(PLAN_START))
    .lte("plan_date", toYMD(RACE_DATE))
    .order("plan_date");

  const allWorkouts: Record<number, WorkoutRow[]> = {};
  for (const row of (allPlanRows ?? []) as any[]) {
    const diffDays = Math.floor(
      (new Date(row.plan_date + "T12:00:00").getTime() - PLAN_START.getTime()) / (1000 * 60 * 60 * 24)
    );
    const wk = Math.floor(diffDays / 7) + 1;
    if (wk >= 1 && wk <= 30) {
      if (!allWorkouts[wk]) allWorkouts[wk] = [];
      allWorkouts[wk].push(row as WorkoutRow);
    }
  }

  return (
    <div>
      <SectionHeader
        title={marathon.raceName}
        subtitle={`${marathon.raceDate} · Goal ${marathon.goalTime}`}
      />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Countdown */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AcornIcon size={14} className="text-primary/50" />
              <CardTitle>Race countdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-bold text-accent tabular-nums">
              {daysToRace}
            </p>
            <p className="text-xs text-muted-foreground mt-1">days to {marathon.raceDate}</p>
          </CardContent>
        </Card>

        {/* PR → Goal */}
        <Card>
          <CardHeader><CardTitle>Current PR</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-semibold text-muted-foreground">{marathon.currentPR}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Goal time</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-semibold text-positive">{marathon.goalTime}</p>
          </CardContent>
        </Card>

        {/* Current week / phase */}
        <Card>
          <CardHeader><CardTitle>Plan status</CardTitle></CardHeader>
          <CardContent>
            {preStart ? (
              <>
                <p className="text-2xl font-mono font-semibold text-foreground">
                  {getDaysToStart()}d
                </p>
                <p className="text-xs text-muted-foreground mt-1">until training starts ({marathon.planStartDate})</p>
              </>
            ) : postRace ? (
              <p className="text-sm font-semibold text-positive">Race complete 🏅</p>
            ) : currentPlanWeek ? (
              <>
                <p className="text-2xl font-mono font-semibold text-foreground">Wk {currentWeek}</p>
                <span className={`inline-block mt-1 rounded px-2 py-0.5 text-xs font-medium ${PHASE_BADGE[currentPlanWeek.phase]}`}>
                  {currentPlanWeek.phase}
                </span>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* ── Fitness snapshot ──────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Fitness Snapshot</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Easy pace</p>
              <p className="text-xl font-mono font-semibold text-foreground">
                <MetricHover metric={paceToKmLabel("9:08/mi")}>9:08/mi</MetricHover>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Moderate pace</p>
              <p className="text-xl font-mono font-semibold text-foreground">
                <MetricHover metric={paceToKmLabel("8:01/mi")}>8:01/mi</MetricHover>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Avg weekly mileage</p>
              <p className="text-xl font-mono font-semibold text-foreground">
                <MetricHover metric={miToKmLabel(19.9)}>19.9 mi</MetricHover>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Training peak</p>
              <p className="text-xl font-mono font-semibold text-foreground">
                <MetricHover metric={miToKmLabel(33.3)}>33.3 mi</MetricHover>
              </p>
              <p className="text-xs text-muted-foreground">Jan &apos;26</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Interactive plan explorer (chart + week detail) ───── */}
      <WeekPlanExplorer
        currentWeek={currentWeek}
        allWorkouts={allWorkouts}
        actualMiByWeek={actualMiByWeek}
        preStart={preStart}
        postRace={postRace}
      />

      {/* ── Pace zones ────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Pace Zones</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {marathon.paceZones.map(({ label, pace, accent }) => (
              <div
                key={label}
                className={[
                  "rounded-lg border p-3",
                  accent
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card",
                ].join(" ")}
              >
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className={`font-mono font-bold text-lg ${accent ? "text-accent" : "text-foreground"}`}>
                  <MetricHover metric={paceToKmLabel(pace)}>
                    {pace}
                  </MetricHover>
                </p>
                {accent && (
                  <p className="text-xs text-primary font-medium mt-0.5">Goal MP</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Tune-up races ─────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Tune-up Races</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {marathon.tuneUpRaces.map((race, i) => (
              <div key={race.name} className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-xs text-green-700 font-medium mb-1">
                  Race {i + 1} · Week {race.week} · {race.date}
                </p>
                <p className="font-semibold text-foreground">{race.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{race.goal}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Full plan table ────────────────────────────────────── */}
      <PlanTable currentWeek={currentWeek} actualMiByWeek={actualMiByWeek} />
    </div>
  );
}
