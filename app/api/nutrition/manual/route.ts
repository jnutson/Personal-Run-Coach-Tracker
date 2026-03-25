import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { NutritionDaily } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, calories, protein_g, carbs_g, fat_g, hydration_oz } = body;

  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const db = createServiceClient();
  // @ts-ignore
  const { error } = await (db.from("nutrition_daily") as any).upsert(
    { date, calories, protein_g, carbs_g, fat_g, hydration_oz },
    { onConflict: "date" }
  );

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
