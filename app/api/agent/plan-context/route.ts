/**
 * GET /api/agent/plan-context
 *
 * Returns a compact plan arc summary for the adjust-plan agent.
 * Gives Claude the macro context it needs to understand whether a local
 * change (e.g. swap tempo → easy) is safe or compounds an existing deficit.
 *
 * Returns:
 *  - goal: race date, target time, weeks remaining
 *  - current: week number, phase, days until plan start (if pre-plan)
 *  - peak_week: target total km and which week it falls on
 *  - weekly_mileage: last 4 weeks planned vs actual, cumulative deficit
 *
 * Auth: Bearer SYNC_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { marathon as marathonConfig } from "@/config/user";
import { subDays, format, startOfWeek, addDays, differenceInDays, differenceInWeeks } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();

  // ── Load goal settings ─────────────────────────────────────────────────────
  const { data: settings } = await (db.from("user_settings") as any)
    .select("goal_race_time, goal_race_date, plan_start_date")
    .limit(1)
    .single();

  const raceDate      = new Date((settings?.goal_race_date  ?? marathonConfig.raceDate)      + "T12:00:00");
  const planStartDate = new Date((settings?.plan_start_date ?? marathonConfig.planStartDate) + "T12:00:00");
  const goalTime      = settings?.goal_race_time ?? marathonConfig.goalTime;
  const todayDate     = new Date();

  // ── Week / phase calculations ──────────────────────────────────────────────
  const daysIntoPlan    = differenceInDays(todayDate, planStartDate);
  const weeksIntoPlan   = Math.floor(daysIntoPlan / 7);          // 0-indexed
  const currentWeekNum  = Math.max(1, Math.min(18, weeksIntoPlan + 1)); // 1-18, clamp
  const weeksToRace     = Math.max(0, differenceInWeeks(raceDate, todayDate));
  const prePlan         = daysIntoPlan < 0;
  const daysUntilPlan   = prePlan ? Math.abs(daysIntoPlan) : 0;

  const phase = (() => {
    if (prePlan)            return "Pre-plan";
    if (weeksIntoPlan < 6)  return "Base (weeks 1–6)";
    if (weeksIntoPlan < 14) return "Build (weeks 7–14)";
    if (weeksIntoPlan < 16) return "Peak (weeks 15–16)";
    return "Taper (weeks 17–18)";
  })();

  // ── Peak week target (week 14, index 13) ──────────────────────────────────
  const peakWeekStart = addDays(planStartDate, 13 * 7);
  const peakWeekEnd   = addDays(peakWeekStart, 6);
  const { data: peakRows } = await db.from("training_plan")
    .select("target_distance_km")
    .gte("plan_date", format(peakWeekStart, "yyyy-MM-dd"))
    .lte("plan_date", format(peakWeekEnd, "yyyy-MM-dd"));

  const peakWeekKm = (peakRows ?? []).reduce(
    (s: number, r: { target_distance_km: number | null }) => s + (r.target_distance_km ?? 0), 0
  );

  // ── Last 4 completed weeks: planned vs actual ──────────────────────────────
  // We go back from the START of the current week so we only look at full weeks.
  const currentWeekMonday = startOfWeek(todayDate, { weekStartsOn: 1 });
  const weeklyMileage = [];
  let cumulativeDeficitKm = 0;

  for (let w = 4; w >= 1; w--) {
    const weekStart = addDays(currentWeekMonday, -w * 7);
    const weekEnd   = addDays(weekStart, 6);

    // Only include weeks that fall inside the plan
    if (weekEnd < planStartDate || weekStart > raceDate) {
      weeklyMileage.push({
        week: format(weekStart, "MMM d"),
        planned_km: null,
        actual_km: null,
        note: weekEnd < planStartDate ? "Pre-plan" : "Post-race",
      });
      continue;
    }

    const [plannedRes, actualRes] = await Promise.all([
      db.from("training_plan")
        .select("target_distance_km")
        .gte("plan_date", format(weekStart, "yyyy-MM-dd"))
        .lte("plan_date", format(weekEnd, "yyyy-MM-dd")),
      db.from("garmin_activities")
        .select("distance_km, activity_type")
        .gte("activity_date", format(weekStart, "yyyy-MM-dd"))
        .lte("activity_date", format(weekEnd, "yyyy-MM-dd"))
        .in("activity_type", ["run", "running"]),
    ]);

    const plannedKm = (plannedRes.data ?? []).reduce(
      (s: number, r: { target_distance_km: number | null }) => s + (r.target_distance_km ?? 0), 0
    );
    const actualKm = (actualRes.data ?? []).reduce(
      (s: number, r: { distance_km: number | null }) => s + (r.distance_km ?? 0), 0
    );
    const diffKm = actualKm - plannedKm;
    cumulativeDeficitKm += diffKm;

    weeklyMileage.push({
      week: format(weekStart, "MMM d"),
      planned_km: Math.round(plannedKm * 10) / 10,
      actual_km:  Math.round(actualKm  * 10) / 10,
      diff_km:    Math.round(diffKm    * 10) / 10,
    });
  }

  // ── Current week planned ───────────────────────────────────────────────────
  const currentWeekEnd = addDays(currentWeekMonday, 6);
  const { data: thisWeekPlan } = await db.from("training_plan")
    .select("target_distance_km")
    .gte("plan_date", format(currentWeekMonday, "yyyy-MM-dd"))
    .lte("plan_date", format(currentWeekEnd, "yyyy-MM-dd"));

  const thisWeekPlannedKm = (thisWeekPlan ?? []).reduce(
    (s: number, r: { target_distance_km: number | null }) => s + (r.target_distance_km ?? 0), 0
  );

  return NextResponse.json({
    goal: {
      race_date:  format(raceDate, "yyyy-MM-dd"),
      target_time: goalTime,
      weeks_to_race: weeksToRace,
    },
    current: {
      week_number:      currentWeekNum,
      phase,
      pre_plan:         prePlan,
      days_until_plan:  daysUntilPlan,
      this_week_planned_km: Math.round(thisWeekPlannedKm * 10) / 10,
    },
    peak_week: {
      week_start:  format(peakWeekStart, "yyyy-MM-dd"),
      total_km:    Math.round(peakWeekKm * 10) / 10,
      total_miles: Math.round(peakWeekKm * 0.621371 * 10) / 10,
    },
    weekly_mileage: {
      last_4_weeks: weeklyMileage,
      cumulative_deficit_km:    Math.round(cumulativeDeficitKm * 10) / 10,
      cumulative_deficit_miles: Math.round(cumulativeDeficitKm * 0.621371 * 10) / 10,
    },
  });
}
