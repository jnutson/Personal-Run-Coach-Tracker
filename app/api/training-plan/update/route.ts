/**
 * PATCH /api/training-plan/update
 *
 * Update a training plan row. Accepts either `id` (UUID) or `plan_date` (YYYY-MM-DD)
 * to identify the row — the agent uses plan_date; the UI uses id.
 *
 * Updatable fields: workout_type, target_distance_km, target_pace_desc, notes, completed
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, plan_date, notes, completed, target_distance_km, target_pace_desc, workout_type } = body;

  if (!id && !plan_date) {
    return NextResponse.json({ error: "id or plan_date required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (workout_type        !== undefined) update.workout_type        = workout_type;
  if (notes               !== undefined) update.notes               = notes;
  if (completed           !== undefined) update.completed           = completed;
  if (target_distance_km  !== undefined) update.target_distance_km  = target_distance_km;
  if (target_pace_desc    !== undefined) update.target_pace_desc    = target_pace_desc;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const db = createServiceClient();
  const query = id
    ? db.from("training_plan").update(update as never).eq("id", id)
    : db.from("training_plan").update(update as never).eq("plan_date", plan_date);

  const { error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
