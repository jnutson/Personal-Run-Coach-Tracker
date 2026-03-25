/**
 * POST /api/agent/reconcile-week
 *
 * Matches what Josh actually did this week (Garmin activities) against what
 * was planned (training_plan rows), then marks plan workouts as completed.
 *
 * Core principle: the WEEK is the unit of accountability, not the day.
 * A rest day Monday + double workout Tuesday = fine. What matters is whether
 * the weekly stimulus (volume, intensity types) got covered.
 *
 * Tools:
 *   get_week_plan        — planned workouts for current week (Mon–Sun)
 *   get_week_activities  — actual Garmin activities for current week
 *   complete_workout     — mark a plan row complete, noting actual date if different
 *
 * Runs silently (no Telegram message unless the week is significantly short).
 * Auth: Bearer SYNC_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { branding } from "@/config/user";

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID     = process.env.TELEGRAM_CHAT_ID!;
const SYNC_SECRET = process.env.SYNC_SECRET!;

async function sendTelegram(text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" }),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function weekBounds(offset = 0): { start: string; end: string } {
  const ref = offset === 0 ? new Date() : subWeeks(new Date(), Math.abs(offset));
  return {
    start: format(startOfWeek(ref, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end:   format(endOfWeek(ref,   { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function getWeekPlan(weekOffset = 0) {
  const { start, end } = weekBounds(weekOffset);
  const db = createServiceClient();

  const { data } = await db.from("training_plan")
    .select("id, plan_date, workout_type, target_distance_km, target_pace_desc, notes, completed")
    .gte("plan_date", start)
    .lte("plan_date", end)
    .order("plan_date");

  const planned_km = (data ?? []).reduce(
    (s: number, r: { target_distance_km: number | null }) => s + (r.target_distance_km ?? 0), 0
  );

  return {
    week_start: start,
    week_end: end,
    workouts: data ?? [],
    total_planned_km: Math.round(planned_km * 10) / 10,
  };
}

async function getWeekActivities(weekOffset = 0) {
  const { start, end } = weekBounds(weekOffset);
  const db = createServiceClient();

  const { data } = await db.from("garmin_activities")
    .select("garmin_id, activity_date, activity_type, name, distance_km, duration_sec, avg_hr, max_hr, avg_pace_sec_km, calories")
    .gte("activity_date", start)
    .lte("activity_date", end)
    .order("activity_date");

  const run_km = (data ?? [])
    .filter((a: { activity_type: string }) => ["run", "running"].includes(a.activity_type))
    .reduce((s: number, a: { distance_km: number | null }) => s + (a.distance_km ?? 0), 0);

  return {
    week_start: start,
    week_end: end,
    activities: data ?? [],
    total_run_km: Math.round(run_km * 10) / 10,
  };
}

async function completeWorkout(args: {
  plan_date: string;
  actual_date?: string;
  note?: string;
}) {
  const db = createServiceClient();

  const note = args.actual_date && args.actual_date !== args.plan_date
    ? `[Done ${args.actual_date}] ${args.note ?? ""}`.trim()
    : args.note ?? "Completed";

  const { error } = await db.from("training_plan")
    .update({ completed: true, notes: note } as never)
    .eq("plan_date", args.plan_date);

  if (error) return { success: false, error: error.message };
  return { success: true, plan_date: args.plan_date, actual_date: args.actual_date ?? args.plan_date };
}

// ── Tool definitions for Claude ───────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_week_plan",
    description: "Returns the training plan for the current week (Mon–Sun). Pass week_offset=-1 to check last week if running on Monday.",
    input_schema: {
      type: "object" as const,
      properties: {
        week_offset: {
          type: "number",
          description: "0 = current week, -1 = last week. Default 0.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_week_activities",
    description: "Returns actual Garmin activities logged for the week. Includes activity type, distance, HR, and pace so you can classify each workout.",
    input_schema: {
      type: "object" as const,
      properties: {
        week_offset: {
          type: "number",
          description: "0 = current week, -1 = last week. Default 0.",
        },
      },
      required: [],
    },
  },
  {
    name: "complete_workout",
    description: `Marks a planned workout as completed. Use plan_date to identify which plan row to mark.
If the workout was done on a different day than planned, set actual_date to when it was really done.
Always set a brief note explaining the match (e.g. "Tempo done Thursday instead of Tuesday — same effort").`,
    input_schema: {
      type: "object" as const,
      properties: {
        plan_date: {
          type: "string",
          description: "The date of the planned workout to mark complete (YYYY-MM-DD).",
        },
        actual_date: {
          type: "string",
          description: "The date the workout was actually done, if different from plan_date (YYYY-MM-DD).",
        },
        note: {
          type: "string",
          description: "Brief note about the match — especially if done on a different day or with modified effort.",
        },
      },
      required: ["plan_date"],
    },
  },
];

// ── Agentic loop ──────────────────────────────────────────────────────────────

async function runAgent(): Promise<{ summary: string; notifyUser: boolean }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon … 6=Sat
  const isMonday  = dayOfWeek === 1;

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `You are reconciling ${branding.userName}'s training plan for the week. Your job is to match what they actually did (Garmin activities) against what was planned, then mark the correct plan rows as completed.

CORE PRINCIPLE — the week is the unit, not the day:
They may have rested on a planned workout day and doubled up another day. That is fine and should be counted as completed. You are not penalising day-level mismatches — only checking whether the weekly stimulus was covered.

PROTOCOL:
1. Call get_week_plan to see what was planned this week.${isMonday ? "\n   It's Monday — also call get_week_plan(week_offset=-1) and get_week_activities(week_offset=-1) to reconcile last week before it falls out of window." : ""}
2. Call get_week_activities to see what was actually done.
3. Match each activity to the best-fitting planned workout using this logic:

MATCHING RULES (apply in order):
- Long run: actual distance ≥ 20 km → matches the planned long run for the week
- Intervals: avg_hr near max_hr OR pace significantly faster than easy → matches intervals
- Tempo: sustained effort, avg_hr moderately high, distance 10–18 km → matches tempo
- Easy: everything else that is a run → matches an easy day
- Rest days: if no activity on a planned rest day, that's already correct — do NOT mark rest days as completed unless there was cross-training

COMPLETING WORKOUTS:
- For each matched pair: call complete_workout(plan_date=<planned date>, actual_date=<when done>, note=<brief explanation>)
- If ${branding.userName} did 2 workouts on one day and 0 on another: match both against the planned workouts for those days — use the plan row that best fits each activity, regardless of which day it fell on
- If a planned workout has no matching activity yet (e.g. it's only Wednesday and the long run is Saturday): leave it — do not mark it complete
- Do not mark a planned workout complete if there is no corresponding Garmin activity

WHEN TO NOTIFY ${branding.userName.toUpperCase()} (set notify=true in your response):
- Weekly run volume < 70% of planned AND the week is over (Sunday) or nearly over (Saturday)
- A quality session (tempo or intervals) was missed with no equivalent effort anywhere in the week
- Otherwise: reconcile silently (notify=false)

After completing all tool calls, respond with a JSON object on its own line:
{"summary": "<1-2 sentence summary of what was reconciled>", "notify": <true|false>}`,
    },
  ];

  let finalSummary   = "Week reconciled.";
  let notifyUser     = false;

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
      if (textBlock?.type === "text") {
        // Extract JSON from the final message
        const match = textBlock.text.match(/\{[\s\S]*"summary"[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            finalSummary = parsed.summary ?? finalSummary;
            notifyUser   = parsed.notify   ?? false;
          } catch { /* keep defaults */ }
        }
      }
      break;
    }

    if (response.stop_reason !== "tool_use") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      const input = block.input as Record<string, unknown>;
      let result: unknown;

      if (block.name === "get_week_plan") {
        result = await getWeekPlan((input.week_offset as number) ?? 0);
      } else if (block.name === "get_week_activities") {
        result = await getWeekActivities((input.week_offset as number) ?? 0);
      } else if (block.name === "complete_workout") {
        result = await completeWorkout(input as Parameters<typeof completeWorkout>[0]);
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

  return { summary: finalSummary, notifyUser };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { summary, notifyUser } = await runAgent();

    // Only message if the week looks short or a quality session was missed
    if (notifyUser) {
      await sendTelegram(`📋 *Weekly Training Check*\n\n${summary}`);
    }

    return NextResponse.json({ success: true, summary, notified: notifyUser });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sendTelegram(`⚠️ *Reconcile-week agent failed*\n\n\`${msg}\``);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
