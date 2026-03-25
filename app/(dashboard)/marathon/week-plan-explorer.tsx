"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MileageChart } from "./mileage-chart";
import { MetricHover } from "@/components/metric-hover";
import { miToKmLabel } from "@/lib/metric-utils";
import { planWeeks, keySession, PHASE_BADGE } from "@/data/marathon-plan";
import { AcornIcon } from "@/components/acorn-icon";
import { fmt, KM_TO_MI } from "@/lib/utils";

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  easy:      "bg-blue-100 text-blue-700",
  tempo:     "bg-amber-100 text-amber-700",
  long:      "bg-purple-100 text-purple-700",
  intervals: "bg-red-100 text-red-700",
  rest:      "bg-gray-100 text-gray-500",
  race:      "bg-green-100 text-green-700",
  bike:      "bg-cyan-100 text-cyan-700",
};

function dayLabel(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
}

export interface WorkoutRow {
  plan_date: string;
  workout_type: string;
  target_distance_km: number | null;
  target_pace_desc: string | null;
  completed: boolean;
}

interface Props {
  currentWeek: number;
  allWorkouts: Record<number, WorkoutRow[]>;
  actualMiByWeek: Record<number, number>;
  preStart: boolean;
  postRace: boolean;
}

export function WeekPlanExplorer({
  currentWeek,
  allWorkouts,
  actualMiByWeek,
  preStart,
  postRace,
}: Props) {
  const defaultWeek = preStart ? 1 : postRace ? 30 : Math.max(1, Math.min(30, currentWeek));
  const [selectedWeek, setSelectedWeek] = useState(defaultWeek);

  const planWeekData  = planWeeks.find((w) => w.wk === selectedWeek);
  const workouts      = allWorkouts[selectedWeek] ?? [];
  const actualMi      = actualMiByWeek[selectedWeek] ?? null;
  const isCurrentWeek = selectedWeek === currentWeek && !preStart && !postRace;

  return (
    <>
      {/* ── 30-Week Mileage Chart ──────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <AcornIcon size={14} className="text-primary/60" />
                <CardTitle>30-Week Mileage Plan</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Click any bar to see that week&apos;s workouts</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["Recovery","Base","Threshold","Race-Spec","Taper","Race"] as const).map((p) => (
                <span key={p} className={`rounded px-2 py-0.5 text-xs font-medium ${PHASE_BADGE[p]}`}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MileageChart
            currentWeek={currentWeek}
            selectedWeek={selectedWeek}
            onWeekClick={setSelectedWeek}
          />
        </CardContent>
      </Card>

      {/* ── Selected week detail ───────────────────────────────── */}
      {planWeekData && (
        <Card className={`mb-6 ${isCurrentWeek ? "border-primary/40 bg-primary/5" : "border-border"}`}>
          <CardHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle>
                Week {selectedWeek} — {planWeekData.date}
              </CardTitle>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${PHASE_BADGE[planWeekData.phase]}`}>
                {planWeekData.phase}
              </span>
              {planWeekData.down && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                  ↓ Down week
                </span>
              )}
              {isCurrentWeek && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary">
                  current week
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Mileage row */}
            <div className="flex flex-wrap gap-8 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Target</p>
                <p className="text-3xl font-mono font-bold text-foreground">
                  <MetricHover metric={miToKmLabel(planWeekData.mi)}>
                    {planWeekData.mi}
                  </MetricHover>{" "}
                  <span className="text-base font-normal text-muted-foreground">mi</span>
                </p>
              </div>
              {actualMi != null && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Actual</p>
                  <p className={`text-3xl font-mono font-bold ${
                    actualMi >= planWeekData.mi * 0.9 ? "text-positive" :
                    actualMi >= planWeekData.mi * 0.7 ? "text-warning" : "text-negative"
                  }`}>
                    {fmt(actualMi, 1)}{" "}
                    <span className="text-base font-normal text-muted-foreground">mi</span>
                  </p>
                </div>
              )}
            </div>

            {planWeekData.tuneUp && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                🏁 {planWeekData.tuneUp}
              </div>
            )}

            {/* Planned workouts from DB */}
            {workouts.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                  Planned Workouts
                </p>
                <div className="space-y-1">
                  {workouts.map((w) => {
                    const isRest = w.workout_type === "rest";
                    return (
                      <div
                        key={w.plan_date}
                        className={[
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                          w.completed ? "opacity-40 bg-muted/30" : "bg-background/80",
                        ].join(" ")}
                      >
                        <span className="w-7 shrink-0 text-xs text-muted-foreground font-mono">
                          {dayLabel(w.plan_date)}
                        </span>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${WORKOUT_TYPE_COLORS[w.workout_type] ?? "bg-muted text-muted-foreground"}`}>
                          {w.workout_type}
                        </span>
                        {!isRest && w.target_distance_km && (
                          <span className="font-mono text-xs tabular-nums shrink-0">
                            <MetricHover metric={`${w.target_distance_km.toFixed(1)} km`}>
                              {(w.target_distance_km * KM_TO_MI).toFixed(1)} mi
                            </MetricHover>
                          </span>
                        )}
                        {w.target_pace_desc && (
                          <span className="text-xs text-muted-foreground truncate">
                            {w.target_pace_desc}
                          </span>
                        )}
                        {w.completed && (
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">✓ done</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fallback to static key session when no DB rows */}
            {workouts.length === 0 && keySession[selectedWeek] && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Key session</p>
                <p className="font-semibold text-foreground">{keySession[selectedWeek].title}</p>
                <p className="text-sm text-muted-foreground mt-1">{keySession[selectedWeek].detail}</p>
              </div>
            )}

            {workouts.length === 0 && !keySession[selectedWeek] && (
              <p className="text-sm text-muted-foreground italic">
                No detailed workouts loaded yet for this week.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
