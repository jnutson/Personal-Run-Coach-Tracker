/**
 * POST /api/cronometer/sync
 * Called by the cronometer_sync.py script on a daily cron.
 * Body: NutritionDailyInsert[]
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { nutrition = [] } = body;

  const db = createServiceClient();
  const { error } = await (db.from("nutrition_daily") as any)
    .upsert(nutrition, { onConflict: "date" });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, rows: nutrition.length });
}
