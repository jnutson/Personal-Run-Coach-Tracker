/**
 * POST /api/agent/adjust-plan
 *
 * Agentic training plan review. Triggered nightly by telegram_checkin_cron.py
 * after Garmin + Cronometer syncs complete.
 *
 * Claude is given five tools:
 *   get_plan_context    — goal time, week #, phase, 4-week mileage trend, cumulative deficit
 *   get_recovery_data   — 14 days HRV + training load, 7 days sleep/mood/energy
 *   get_upcoming_plan   — next 14 days of the training plan
 *   get_injury_log      — injury/soreness entries from the last 30 days
 *   update_workout      — modify a specific workout by plan_date
 *
 * Claude always calls get_plan_context first so every local change is evaluated
 * against the overall training arc and goal time — not just today's recovery signals.
 *
 * Auth: Bearer SYNC_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { branding } from "@/config/user";
import { createServiceClient } from "@/lib/supabase";
import { subDays, addDays, format } from "date-fns";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID!;
const APP_BASE  = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
const SYNC_SECRET = process.env.SYNC_SECRET!;

async function sendTelegram(text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
  });
}

const todayStr = () => format(new Date(), "yyyy-MM-dd");

// ── Tool implementations ──────────────────────────────────────────────────────

async function getPlanContext() {
  const res = await fetch(`${APP_BASE}/api/agent/plan-context`, {
    headers: { Authorization: `Bearer ${SYNC_SECRET}` },
  });
  return res.json();
}

async function getRecoveryData() {
  const db = createServiceClient();
  const fourteenDaysAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");
  const sevenDaysAgo    = format(subDays(new Date(), 7),  "yyyy-MM-dd");

  const [garminRes, checkinRes] = await Promise.all([
    db.from("garmin_daily")
      .select("date, hrv, training_load, sleep_duration, resting_hr")
      .gte("date", fourteenDaysAgo)
      .order("date"),
    db.from("daily_checkin")
      .select("date, mood, energy, mental_health")
      .gte("date", sevenDaysAgo)
      .order("date"),
  ]);

  return {
    garmin_14d:  garminRes.data  ?? [],
    checkins_7d: checkinRes.data ?? [],
  };
}

async function getUpcomingPlan() {
  const db  = createServiceClient();
  const end = format(addDays(new Date(), 14), "yyyy-MM-dd");

  const { data } = await db.from("training_plan")
    .select("id, plan_date, workout_type, target_distance_km, target_pace_desc, notes, completed")
    .gte("plan_date", todayStr())
    .lte("plan_date", end)
    .order("plan_date");

  return data ?? [];
}

async function getInjuryLog() {
  const db = createServiceClient();
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const { data } = await (db.from("injury_log") as any)
    .select("logged_at, description")
    .gte("logged_at", thirtyDaysAgo)
    .order("logged_at", { ascending: false });

  return data ?? [];
}

async function updateWorkout(args: {
  plan_date: string;
  workout_type?: string;
  target_distance_km?: number;
  target_pace_desc?: string;
  notes: string;
}) {
  const { plan_date, ...fields } = args;
  const update: Record<string, unknown> = { notes: fields.notes };
  if (fields.workout_type       !== undefined) update.workout_type       = fields.workout_type;
  if (fields.target_distance_km !== undefined) update.target_distance_km = fields.target_distance_km;
  if (fields.target_pace_desc   !== undefined) update.target_pace_desc   = fields.target_pace_desc;

  const db = createServiceClient();
  const { error } = await db.from("training_plan").update(update as never).eq("plan_date", plan_date);
  if (error) return { success: false, error: error.message };
  return { success: true, plan_date, updated: update };
}

// ── Tool definitions for Claude ───────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_plan_context",
    description: `CALL THIS FIRST before any other tool.
Returns the macro training arc: goal time, current week number and phase (base/build/peak/taper), weeks remaining to race, last 4 weeks of planned vs actual mileage, cumulative mileage deficit or surplus, and peak week target.
Use this to understand whether any local change (e.g. swap tempo → easy) is safe given the overall arc. A change that looks safe on today's HRV alone may compound an existing deficit and jeopardise the race goal.`,
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_recovery_data",
    description: "Fetches last 14 days of HRV and training load from Garmin, plus last 7 days of mood, energy, and mental health from daily check-ins. Use to assess current recovery state.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_upcoming_plan",
    description: "Fetches the next 14 days of the marathon training plan. Returns workout type, target distance, pace description, and notes for each day.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_injury_log",
    description: "Fetches injury and soreness log entries from the last 30 days.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "update_workout",
    description: `Modifies a specific workout in the training plan by date.
Before calling this, verify the change is justified by BOTH recovery signals AND plan arc context. Ask yourself:
- Does the cumulative mileage deficit make reducing volume risky?
- Is this week in a phase where intensity reduction is recoverable (base) or costly (peak)?
- Can the missed stimulus be safely recovered later in the week?
Only modify workouts in the next 3–5 days. Always set 'notes' explaining the change and how it relates to the overall plan.`,
    input_schema: {
      type: "object" as const,
      properties: {
        plan_date: {
          type: "string",
          description: "Date of the workout to modify, in YYYY-MM-DD format.",
        },
        workout_type: {
          type: "string",
          enum: ["easy", "tempo", "intervals", "long", "rest", "race"],
          description: "New workout type. Only downgrade intensity when signals are clearly poor.",
        },
        target_distance_km: {
          type: "number",
          description: "New target distance in km.",
        },
        target_pace_desc: {
          type: "string",
          description: "New pace or workout description.",
        },
        notes: {
          type: "string",
          description: "Required: explain why this workout was changed AND how it fits the overall plan arc.",
        },
      },
      required: ["plan_date", "notes"],
    },
  },
];

// ── Agentic loop ──────────────────────────────────────────────────────────────

async function runAgent(): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `You are a marathon training coach for ${branding.userName}. Your job is to review tonight's data and make targeted adjustments to their training plan when genuinely warranted — not by default.

PROTOCOL — follow this order every night:
1. get_plan_context → understand the macro arc (goal, phase, deficit/surplus, weeks to race)
2. get_recovery_data → assess today's recovery signals (HRV, load, sleep, mood, energy)
3. get_upcoming_plan → see what's scheduled for the next 14 days
4. get_injury_log → check for any reported injuries or soreness
5. Decide whether to adjust. Use both the arc AND recovery data together.

DECISION FRAMEWORK:
Recovery signals are the trigger. Plan arc is the constraint.

A. If recovery is GOOD (HRV at/above baseline, energy ≥7/10, no injuries):
   → Make no changes. Leave the plan as-is.

B. If recovery is MILDLY POOR (HRV 10–15% below baseline, energy 5–6/10):
   → Only adjust if currently in build or peak phase (base phase is more forgiving).
   → Prefer reducing intensity over reducing volume (e.g. tempo → easy pace, same distance).
   → Do NOT reduce volume if cumulative deficit > 15 km — hold the distance, drop the pace.

C. If recovery is CLEARLY POOR (HRV >15% below baseline for 2+ days, energy <5/10, or active injury):
   → Swap next hard session (tempo/intervals) to easy. Consider moving long run 1 day if needed.
   → Even then: if peak week is within 3 weeks, protect volume — reduce intensity only.
   → If injury is reported for a specific body part, note it in changes.

D. Taper weeks (weeks 17–18): never increase volume, never add intensity back. Protect as-is.

IMPORTANT — always justify changes in terms of the plan arc:
- "HRV is suppressed but we're 3 km behind our mileage ramp — holding distance, dropping tempo to easy effort"
- "Peak week is 4 weeks out. One easy day now is recoverable."
- "Cumulative deficit is already 18 km. Not reducing further despite low energy."

After all tool calls, write a 3–6 sentence plain-English summary for ${branding.userName} covering:
what the data showed, what you changed (or why you didn't), and one forward-looking note.
This will be sent directly to them via Telegram.`,
    },
  ];

  // Agentic loop — continue until Claude stops calling tools
  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.type === "text" ? textBlock.text : "Plan review complete.";
    }

    if (response.stop_reason !== "tool_use") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      let result: unknown;

      if (block.name === "get_plan_context") {
        result = await getPlanContext();
      } else if (block.name === "get_recovery_data") {
        result = await getRecoveryData();
      } else if (block.name === "get_upcoming_plan") {
        result = await getUpcomingPlan();
      } else if (block.name === "get_injury_log") {
        result = await getInjuryLog();
      } else if (block.name === "update_workout") {
        result = await updateWorkout(block.input as Parameters<typeof updateWorkout>[0]);
      } else {
        result = { error: "Unknown tool" };
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return "Plan review complete.";
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runAgent();
    await sendTelegram(`🤖 *Training Plan Review*\n\n${summary}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sendTelegram(`⚠️ *Adjust-plan agent failed*\n\n\`${msg}\``);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
