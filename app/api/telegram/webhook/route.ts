/**
 * POST /api/telegram/webhook
 *
 * Commands:
 *   /survey              — daily check-in (habits + mood/energy/mental health scales + water + journal)
 *   /foodlog             — log today's nutrition (conversational)
 *   /foodlog 2100 150 220 75  — inline: calories protein(g) carbs(g) fat(g)
 *   /journal <text>      — save a journal entry inline
 *   /journal             — prompts for journal text
 *   /void <field> <value|clear>  — override a Garmin metric for today
 *
 * State is stored in Supabase `telegram_state` so it survives serverless cold starts.
 * Journal entries are NOT exposed to the adjust-plan agent (intentionally excluded from
 * get_recovery_data — the agent only sees mood, energy, and mental_health).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const BOT_TOKEN       = process.env.TELEGRAM_BOT_TOKEN!;
const ALLOWED_CHAT_ID = Number(process.env.TELEGRAM_CHAT_ID!);

// ── Conversation steps ────────────────────────────────────────────────────────

const SURVEY_STEPS = [
  { key: "exercise",      prompt: "Did you exercise today? (y/n)",                     type: "bool"      },
  { key: "meditate",      prompt: "Did you meditate today? (y/n)",                      type: "bool"      },
  { key: "stretch",       prompt: "Did you stretch today? (y/n)",                       type: "bool"      },
  { key: "energy",        prompt: "Energy today? (1–10)",                               type: "int10"     },
  { key: "mood",          prompt: "Mood today? (1–10)",                                 type: "int10"     },
  { key: "mental_health", prompt: "Mental health today? (1–10)",                        type: "int10"     },
  { key: "water_cups",    prompt: "💧 Cups of water today? (e.g. 8, or 'skip')",        type: "float_opt" },
  { key: "journal",       prompt: "Anything to journal? (type it or 'skip')",           type: "text"      },
];

const FOODLOG_STEPS = [
  { key: "calories",  prompt: "Calories today? (e.g. 2100)",  type: "float"     },
  { key: "protein_g", prompt: "Protein in grams? (e.g. 155)", type: "float"     },
  { key: "carbs_g",   prompt: "Carbs in grams? (e.g. 220)",   type: "float"     },
  { key: "fat_g",     prompt: "Fat in grams? (e.g. 75)",      type: "float"     },
];

const JOURNAL_STEPS = [
  { key: "journal", prompt: "What's on your mind?", type: "text" },
];

const INJURYLOG_STEPS = [
  { key: "description", prompt: "Describe the injury or soreness (location, severity, when it started):", type: "text" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

function parseBool(text: string): boolean | null {
  const t = text.trim().toLowerCase();
  if (["y", "yes", "yeah", "yep", "1", "true"].includes(t)) return true;
  if (["n", "no", "nope", "nah", "0", "false"].includes(t)) return false;
  return null;
}

function parseInt10(text: string): number | null {
  const n = parseInt(text.trim(), 10);
  return isNaN(n) || n < 1 || n > 10 ? null : n;
}

function parseFloatVal(text: string): number | null {
  const n = parseFloat(text.trim());
  return isNaN(n) || n < 0 ? null : n;
}

function parseInlineFoodlog(args: string): Record<string, number> | null {
  const parts = args.trim().split(/\s+/).map(Number);
  if (parts.length < 4 || parts.some(isNaN)) return null;
  const [calories, protein_g, carbs_g, fat_g] = parts;
  return { calories, protein_g, carbs_g, fat_g };
}

// ── Supabase state ────────────────────────────────────────────────────────────

type ConvType = "survey" | "foodlog" | "journal" | "injurylog";

interface ConvState {
  conv_type: ConvType;
  step: number;
  data: Record<string, unknown>;
}

async function getState(chatId: number): Promise<ConvState | null> {
  const db = createServiceClient();
  // Discard state older than 3 hours — prevents stale half-finished conversations
  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { data } = await (db.from("telegram_state") as any)
    .select("conv_type, step, data, updated_at")
    .eq("chat_id", chatId)
    .gt("updated_at", cutoff)
    .maybeSingle();
  return data ?? null;
}

async function setState(chatId: number, state: ConvState) {
  const db = createServiceClient();
  await (db.from("telegram_state") as any).upsert(
    { chat_id: chatId, ...state, updated_at: new Date().toISOString() },
    { onConflict: "chat_id" }
  );
}

async function clearState(chatId: number) {
  const db = createServiceClient();
  await (db.from("telegram_state") as any).delete().eq("chat_id", chatId);
}

// ── Save actions ──────────────────────────────────────────────────────────────

async function saveSurvey(data: Record<string, unknown>, chatId: number) {
  const db = createServiceClient();
  const { error } = await (db.from("daily_checkin") as any).upsert(
    { date: today(), ...data },
    { onConflict: "date" }
  );

  if (error) {
    await sendMessage(chatId, `⚠️ Failed to save check-in: ${error.message}`);
    return;
  }

  const habits = [
    data.exercise ? "✅ Exercise"  : "❌ Exercise",
    data.meditate ? "✅ Meditate"  : "❌ Meditate",
    data.stretch  ? "✅ Stretch"   : "❌ Stretch",
  ].join("  ");

  const waterLine = data.water_cups != null
    ? `💧 Water: *${data.water_cups} cups*\n`
    : "";

  await sendMessage(chatId, [
    `✨ *Check-in saved for ${today()}*`,
    "",
    habits,
    "",
    `⚡ Energy: *${data.energy}/10*`,
    `😊 Mood: *${data.mood}/10*`,
    `🧠 Mental health: *${data.mental_health}/10*`,
    waterLine.trim() ? waterLine.trim() : "",
    data.journal ? `\n📝 _"${data.journal}"_` : "",
    "",
    "Great work today. See you tomorrow! 🙌",
  ].filter((l) => l !== "").join("\n"));
}

async function saveFoodLog(data: Record<string, unknown>, chatId: number) {
  const db = createServiceClient();
  const { error } = await (db.from("nutrition_daily") as any).upsert(
    { date: today(), ...data },
    { onConflict: "date" }
  );

  if (error) {
    await sendMessage(chatId, `⚠️ Failed to save food log: ${error.message}`);
    return;
  }

  const cal  = data.calories  ? `*${Math.round(data.calories as number)} kcal*` : "—";
  const pro  = data.protein_g ? `${Math.round(data.protein_g as number)}g protein` : "";
  const carb = data.carbs_g   ? `${Math.round(data.carbs_g as number)}g carbs` : "";
  const fat  = data.fat_g     ? `${Math.round(data.fat_g as number)}g fat` : "";

  await sendMessage(chatId,
    `✅ *Food log saved for ${today()}*\n\n🍽 ${cal}\n${[pro, carb, fat].filter(Boolean).join(" · ")}\n\nKeep fueling well! 💪`
  );
}

async function saveJournal(text: string, chatId: number) {
  const db = createServiceClient();
  const { error } = await (db.from("daily_checkin") as any).upsert(
    { date: today(), journal: text },
    { onConflict: "date" }
  );

  if (error) {
    await sendMessage(chatId, `⚠️ Failed to save journal: ${error.message}`);
    return;
  }

  await sendMessage(chatId, `📝 *Journal saved for ${today()}*\n\n_"${text}"_`);
}

async function saveInjuryLog(description: string, chatId: number) {
  const db = createServiceClient();
  const { error } = await (db.from("injury_log") as any).insert({ description });

  if (error) {
    await sendMessage(chatId, `⚠️ Failed to save injury log: ${error.message}`);
    return;
  }

  await sendMessage(chatId, `🩹 *Injury logged*\n\n_"${description}"_\n\nThis will be factored into tonight's training plan review.`);
}

// ── /void — override a Garmin daily metric ────────────────────────────────────

const VOID_FIELD_MAP: Record<string, string> = {
  sleep:   "sleep_duration",  // hours
  hrv:     "hrv",             // ms
  steps:   "steps",
  load:    "training_load",
  battery: "body_battery_end",
  rhr:     "resting_hr",
};

async function handleVoid(parts: string[], chatId: number) {
  const field = parts[0]?.toLowerCase();
  const valueArg = parts[1];

  if (!field || !VOID_FIELD_MAP[field]) {
    await sendMessage(chatId,
      "*Override a Garmin metric for today*\n\n" +
      "Usage: `/void <field> <value|clear>`\n\n" +
      "Fields: `sleep` (hours) · `hrv` (ms) · `steps` · `load` · `battery` (0–100) · `rhr` (bpm)\n\n" +
      "Examples:\n" +
      "`/void sleep 7` — set sleep to 7 h\n" +
      "`/void sleep clear` — delete today's sleep value\n" +
      "`/void hrv 52` — override HRV"
    );
    return;
  }

  const dbField = VOID_FIELD_MAP[field];
  const isClear = !valueArg || ["clear", "delete", "remove", "null"].includes(valueArg.toLowerCase());
  const numValue = isClear ? null : parseFloatVal(valueArg);

  if (!isClear && numValue === null) {
    await sendMessage(chatId, `Invalid value. Use a number or \`clear\`.\nExample: \`/void ${field} 7\``);
    return;
  }

  const db = createServiceClient();
  const { error } = await (db.from("garmin_daily") as any)
    .update({ [dbField]: numValue })
    .eq("date", today());

  if (error) {
    await sendMessage(chatId, `⚠️ Failed to override ${field}: ${error.message}`);
    return;
  }

  const unit: Record<string, string> = {
    sleep: " h", hrv: " ms", steps: " steps", load: "", battery: "%", rhr: " bpm",
  };
  await sendMessage(chatId,
    isClear
      ? `✅ Cleared today's *${field}* value.`
      : `✅ Overrode today's *${field}* → \`${numValue}${unit[field] ?? ""}\``
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body    = await req.json();
  const message = body?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId: number = message.chat.id;
  const text: string   = (message.text ?? "").trim();

  if (chatId !== ALLOWED_CHAT_ID) return NextResponse.json({ ok: true });

  // ── /survey ─────────────────────────────────────────────────────────────────
  if (text === "/survey" || text === "/checkin" || text === "/start") {
    await setState(chatId, { conv_type: "survey", step: 0, data: {} });
    await sendMessage(chatId, `👋 *Evening check-in!*\n\n${SURVEY_STEPS[0].prompt}`);
    return NextResponse.json({ ok: true });
  }

  // ── /journal [inline text] ──────────────────────────────────────────────────
  if (text.startsWith("/journal")) {
    const inline = text.slice("/journal".length).trim();
    if (inline.length > 0) {
      await saveJournal(inline, chatId);
      return NextResponse.json({ ok: true });
    }
    await setState(chatId, { conv_type: "journal", step: 0, data: {} });
    await sendMessage(chatId, `📝 *Journal entry*\n\nWhat's on your mind?`);
    return NextResponse.json({ ok: true });
  }

  // ── /injurylog [inline text] ────────────────────────────────────────────────
  if (text.startsWith("/injurylog")) {
    const inline = text.slice("/injurylog".length).trim();
    if (inline.length > 0) {
      await saveInjuryLog(inline, chatId);
      return NextResponse.json({ ok: true });
    }
    await setState(chatId, { conv_type: "injurylog", step: 0, data: {} });
    await sendMessage(chatId, `🩹 *Injury log*\n\nDescribe the injury or soreness (location, severity, when it started):`);
    return NextResponse.json({ ok: true });
  }

  // ── /foodlog [inline args] ──────────────────────────────────────────────────
  if (text.startsWith("/foodlog")) {
    const args = text.slice("/foodlog".length).trim();
    if (args.length > 0) {
      const data = parseInlineFoodlog(args);
      if (!data) {
        await sendMessage(chatId, "Format: `/foodlog calories protein(g) carbs(g) fat(g)`\nExample: `/foodlog 2100 155 220 75`");
        return NextResponse.json({ ok: true });
      }
      await saveFoodLog(data, chatId);
      return NextResponse.json({ ok: true });
    }
    await setState(chatId, { conv_type: "foodlog", step: 0, data: {} });
    await sendMessage(chatId,
      `🍽 *Food log* — let's track today's nutrition.\n\nTip: one-liner: \`/foodlog 2100 155 220 75\`\n\n${FOODLOG_STEPS[0].prompt}`
    );
    return NextResponse.json({ ok: true });
  }

  // ── /void <field> <value|clear> ─────────────────────────────────────────────
  if (text.startsWith("/void")) {
    const parts = text.slice("/void".length).trim().split(/\s+/);
    await handleVoid(parts, chatId);
    return NextResponse.json({ ok: true });
  }

  // ── /menu & /help ───────────────────────────────────────────────────────────
  if (text === "/menu" || text === "/help") {
    await sendMessage(chatId,
      "*📋 Available Commands*\n\n" +
      "*Daily tracking*\n" +
      "/survey — daily check-in (habits, mood, energy, water)\n" +
      "/journal <text> — save a journal entry\n" +
      "/foodlog 2100 155 220 75 — quick food log (cals · protein · carbs · fat)\n" +
      "/foodlog — conversational food log\n\n" +
      "*Health overrides*\n" +
      "/void <field> <value> — override a Garmin metric for today\n" +
      "  _fields: sleep · hrv · steps · load · battery · rhr_\n" +
      "/void <field> clear — remove an override\n\n" +
      "*Other*\n" +
      "/injurylog <text> — log an injury or soreness\n" +
      "/menu — show this menu"
    );
    return NextResponse.json({ ok: true });
  }

  // ── Active conversation ─────────────────────────────────────────────────────
  const state = await getState(chatId);

  if (!state) {
    await sendMessage(chatId, "Send /survey for your daily check-in, /journal to write a journal entry, /foodlog to log food, or /help for all commands.");
    return NextResponse.json({ ok: true });
  }

  const steps = state.conv_type === "survey"
    ? SURVEY_STEPS
    : state.conv_type === "journal"
    ? JOURNAL_STEPS
    : state.conv_type === "injurylog"
    ? INJURYLOG_STEPS
    : FOODLOG_STEPS;

  const step = steps[state.step];

  // Parse the current step's answer
  let parsed: boolean | number | string | null = null;

  if (step.type === "bool") {
    parsed = parseBool(text);
    if (parsed === null) {
      await sendMessage(chatId, `Please answer y or n.\n\n${step.prompt}`);
      return NextResponse.json({ ok: true });
    }
  } else if (step.type === "int10") {
    parsed = parseInt10(text);
    if (parsed === null) {
      await sendMessage(chatId, `Please enter a number 1–10.\n\n${step.prompt}`);
      return NextResponse.json({ ok: true });
    }
  } else if (step.type === "float") {
    parsed = parseFloatVal(text);
    if (parsed === null) {
      await sendMessage(chatId, `Please enter a number.\n\n${step.prompt}`);
      return NextResponse.json({ ok: true });
    }
  } else if (step.type === "float_opt") {
    if (text.toLowerCase() === "skip") {
      parsed = null;
    } else {
      parsed = parseFloatVal(text);
      if (parsed === null) {
        await sendMessage(chatId, `Please enter a number or say 'skip'.\n\n${step.prompt}`);
        return NextResponse.json({ ok: true });
      }
    }
  } else {
    // text (journal)
    parsed = text.toLowerCase() === "skip" ? null : text;
  }

  if (parsed !== null) state.data[step.key] = parsed;
  state.step++;

  if (state.step < steps.length) {
    await setState(chatId, state);
    await sendMessage(chatId, steps[state.step].prompt);
    return NextResponse.json({ ok: true });
  }

  // ── Conversation complete — save and clear ───────────────────────────────────
  await clearState(chatId);

  if (state.conv_type === "survey") {
    await saveSurvey(state.data, chatId);
  } else if (state.conv_type === "journal") {
    const journalText = state.data.journal as string;
    if (journalText) await saveJournal(journalText, chatId);
    else await sendMessage(chatId, "No text captured — journal not saved.");
  } else if (state.conv_type === "injurylog") {
    const desc = state.data.description as string;
    if (desc) await saveInjuryLog(desc, chatId);
    else await sendMessage(chatId, "No description captured — injury log not saved.");
  } else {
    await saveFoodLog(state.data, chatId);
  }

  return NextResponse.json({ ok: true });
}
