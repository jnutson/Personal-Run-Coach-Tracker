-- ─────────────────────────────────────────────
-- injury_log
-- Records injury descriptions logged via Telegram /injurylog command.
-- Multiple entries per day are allowed.
-- ─────────────────────────────────────────────
create table if not exists injury_log (
  id          uuid primary key default uuid_generate_v4(),
  logged_at   timestamptz default now(),
  description text not null
);

create index if not exists idx_injury_log_logged_at on injury_log (logged_at desc);
