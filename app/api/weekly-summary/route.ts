/**
 * /api/weekly-summary
 *
 * GET  — called by Vercel Cron every Monday at 3 AM UTC (Sunday 8 PM PT).
 *         Vercel automatically sends Authorization: Bearer CRON_SECRET.
 * POST — manual trigger from Mac cron or curl, requires Authorization: Bearer SYNC_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";
import { subDays, format, startOfWeek } from "date-fns";
import { branding, marathon } from "@/config/user";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID!;

async function sendTelegram(text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
  });
}

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  // Vercel cron sends CRON_SECRET; manual trigger uses SYNC_SECRET
  return (
    auth === `Bearer ${process.env.CRON_SECRET}` ||
    auth === `Bearer ${process.env.SYNC_SECRET}`
  );
}

async function generateSummary() {
  const db = createServiceClient();
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const sevenDaysAgo = format(subDays(today, 7), "yyyy-MM-dd");

  const [dailyRes, activitiesRes, nutritionRes, checkinsRes] = await Promise.all([
    db.from("garmin_daily").select("*").gte("date", sevenDaysAgo).order("date"),
    db.from("garmin_activities").select("*").gte("activity_date", sevenDaysAgo).order("activity_date"),
    db.from("nutrition_daily").select("*").gte("date", sevenDaysAgo).order("date"),
    db.from("daily_checkin").select("*").gte("date", sevenDaysAgo).order("date"),
  ]);

  const garminDaily = (dailyRes.data ?? []) as any[];
  const activities  = (activitiesRes.data ?? []) as any[];
  const nutrition   = (nutritionRes.data ?? []) as any[];
  const checkins    = (checkinsRes.data ?? []) as any[];

  const avg = <T extends Record<string, unknown>>(arr: T[], key: keyof T) => {
    const vals = arr.filter((d) => d[key] != null).map((d) => d[key] as number);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };

  const totalRunKm   = activities
    .filter((a) => a.activity_type === "run" || a.activity_type === "running")
    .reduce((s: number, a: { distance_km?: number | null }) => s + (a.distance_km ?? 0), 0);

  const latestLoad = garminDaily[garminDaily.length - 1]?.training_load;
  const vo2max     = garminDaily[garminDaily.length - 1]?.vo2max;

  const dataContext = `
Week of ${weekStart}:

TRAINING:
- Total run distance: ${totalRunKm.toFixed(1)} km across ${activities.filter((a: { activity_type: string }) => a.activity_type === "run" || a.activity_type === "running").length} runs
- Activities: ${activities.map((a: { name?: string | null; activity_type: string; distance_km?: number | null }) => `${a.name ?? a.activity_type} (${a.distance_km?.toFixed(1) ?? "?"} km)`).join(", ") || "None"}
- Training load: ${latestLoad ?? "N/A"}
- VO2 Max: ${vo2max ?? "N/A"}

SLEEP & HEALTH:
- Avg sleep: ${avg(garminDaily, "sleep_duration").toFixed(1)} hrs/night
- Avg HRV: ${avg(garminDaily, "hrv").toFixed(0)} ms
- Resting HR trend: ${garminDaily.map((d: { resting_hr?: number | null }) => d.resting_hr ?? "?").join(", ")} bpm

NUTRITION:
- Avg daily calories: ${avg(nutrition, "calories").toFixed(0)} kcal
- Avg protein: ${avg(nutrition, "protein_g").toFixed(0)} g/day

DAILY HABITS & WELLBEING:
- Exercise: ${checkins.filter((d: { exercise?: boolean | null }) => d.exercise).length}/7 days
- Meditation: ${checkins.filter((d: { meditate?: boolean | null }) => d.meditate).length}/7 days
- Stretching: ${checkins.filter((d: { stretch?: boolean | null }) => d.stretch).length}/7 days
- Avg Energy: ${avg(checkins, "energy").toFixed(1)}/10
- Avg Mood: ${avg(checkins, "mood").toFixed(1)}/10
- Avg Mental Health: ${avg(checkins, "mental_health").toFixed(1)}/10

JOURNAL HIGHLIGHTS:
${checkins.filter((d: { journal?: string | null }) => d.journal).map((d: { date: string; journal?: string | null }) => `- ${d.date}: "${d.journal}"`).join("\n") || "None this week."}
`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are a personal wellness coach for ${branding.userName}, a marathon runner in training (target race: ${marathon.raceDate}, goal: ${marathon.goalTime}).

Write a concise 200-300 word weekly summary in plain English based on the data below. Structure it as:
1. A brief overview of the week (2-3 sentences)
2. Wins — what went well
3. Concerns — anything to flag (e.g. low HRV + high mileage = overtraining risk, low sleep, poor nutrition)
4. 2-3 actionable suggestions for next week

Be specific, encouraging but honest. Use the data. Don't pad.

${dataContext}`,
      },
    ],
  });

  const summaryText = message.content[0].type === "text" ? message.content[0].text : "";

  await (db.from("weekly_summaries") as any).upsert(
    { week_start: weekStart, summary_text: summaryText },
    { onConflict: "week_start" }
  );

  await sendTelegram(`📊 *Weekly Summary — ${weekStart}*\n\n${summaryText}`);

  return { weekStart, chars: summaryText.length };
}

// Vercel Cron calls GET
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await generateSummary();
  return NextResponse.json({ success: true, ...result });
}

// Manual trigger via Mac cron or curl
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await generateSummary();
  return NextResponse.json({ success: true, ...result });
}
