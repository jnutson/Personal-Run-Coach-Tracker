-- ─────────────────────────────────────────────
-- telegram_state
-- Persists Telegram bot conversation state across serverless invocations.
-- One row per chat_id, overwritten on each step.
-- ─────────────────────────────────────────────
create table if not exists telegram_state (
  chat_id   bigint primary key,
  conv_type text    not null,
  step      int     not null default 0,
  data      jsonb   not null default '{}',
  updated_at timestamptz default now()
);
