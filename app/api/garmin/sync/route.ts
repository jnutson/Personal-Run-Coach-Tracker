/**
 * POST /api/garmin/sync
 * Called by the Vercel Cron job (vercel.json) or manually.
 * Expects the Python sync script to POST processed data here,
 * OR this route can trigger the Python script via a shell call on a self-hosted runner.
 *
 * For Vercel (serverless), the Garmin data is pushed to this endpoint
 * by the external garmin_sync.py script running on a cron server (e.g. a VPS or Mac cron).
 *
 * Body: { daily: GarminDailyInsert[], activities: GarminActivityInsert[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // Simple bearer token check to prevent unauthorized pushes
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { daily = [], activities = [] } = body;

  const db = createServiceClient();

  const errors: string[] = [];

  if (daily.length > 0) {
    const { error } = await (db.from("garmin_daily") as any)
      .upsert(daily, { onConflict: "date" });
    if (error) errors.push(`daily: ${error.message}`);
  }

  if (activities.length > 0) {
    const { error } = await (db.from("garmin_activities") as any)
      .upsert(activities, { onConflict: "garmin_id" });
    if (error) errors.push(`activities: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 500 });
  }

  return NextResponse.json({ success: true, daily: daily.length, activities: activities.length });
}
