/**
 * GET /api/nutrition/status
 *
 * Returns whether today's nutrition has been logged.
 * Used by the Telegram cron script to decide whether to send a food log reminder.
 *
 * Auth: Bearer token (SYNC_SECRET)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const db = createServiceClient();

  const { data, error } = await (db.from("nutrition_daily") as any)
    .select("date, calories")
    .eq("date", today)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    date: today,
    logged: !!data?.calories,
  });
}
