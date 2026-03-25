-- Personal Tracker — Initial Schema
-- Run this in Supabase SQL editor or via supabase db push

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- garmin_daily
-- One row per calendar day; upserted by sync job
-- ─────────────────────────────────────────────
create table if not exists garmin_daily (
  id              uuid primary key default uuid_generate_v4(),
  date            date not null unique,
  hrv             numeric,          -- ms, daily average
  resting_hr      int,              -- bpm
  body_battery_start int,           -- 0-100
  body_battery_end   int,           -- 0-100
  steps           int,
  sleep_duration  numeric,          -- hours
  sleep_score     int,              -- 0-100
  recovery_score  int,              -- 0-100
  training_load   numeric,          -- acute load score
  vo2max          numeric,          -- ml/kg/min
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- garmin_activities
-- One row per Garmin activity
-- ─────────────────────────────────────────────
create table if not exists garmin_activities (
  id              uuid primary key default uuid_generate_v4(),
  garmin_id       bigint unique,
  activity_date   date not null,
  activity_type   text not null,    -- 'run', 'cycling', 'strength', etc.
  name            text,
  distance_km     numeric,
  duration_sec    int,
  avg_hr          int,
  max_hr          int,
  avg_pace_sec_km int,              -- seconds per km
  elevation_m     numeric,
  calories        int,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- training_plan
-- Planned workouts — pre-populated for marathon plan
-- ─────────────────────────────────────────────
create table if not exists training_plan (
  id              uuid primary key default uuid_generate_v4(),
  plan_date       date not null unique,
  workout_type    text not null,    -- 'easy', 'long', 'tempo', 'intervals', 'rest', 'race'
  target_distance_km numeric,
  target_pace_desc text,            -- e.g. "6:30-7:00 /km easy effort"
  notes           text,
  completed       boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- nutrition_daily
-- One row per day from Cronometer
-- ─────────────────────────────────────────────
create table if not exists nutrition_daily (
  id              uuid primary key default uuid_generate_v4(),
  date            date not null unique,
  calories        numeric,
  calorie_target  numeric default 2800,
  protein_g       numeric,
  carbs_g         numeric,
  fat_g           numeric,
  iron_mg         numeric,
  sodium_mg       numeric,
  potassium_mg    numeric,
  magnesium_mg    numeric,
  vitamin_d_iu    numeric,
  calcium_mg      numeric,
  hydration_oz    numeric,          -- from Telegram check-in
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────────
-- daily_checkin
-- Written by Telegram bot every evening
-- ─────────────────────────────────────────────
create table if not exists daily_checkin (
  id              uuid primary key default uuid_generate_v4(),
  date            date not null unique,
  exercise        boolean,
  meditate        boolean,
  stretch         boolean,
  energy          int check (energy between 1 and 10),
  mood            int check (mood between 1 and 10),
  mental_health   int check (mental_health between 1 and 10),
  journal         text,
  logged_at       timestamptz default now()
);

-- ─────────────────────────────────────────────
-- weekly_summaries
-- AI-generated weekly review, stored for archive
-- ─────────────────────────────────────────────
create table if not exists weekly_summaries (
  id              uuid primary key default uuid_generate_v4(),
  week_start      date not null unique,
  summary_text    text not null,
  generated_at    timestamptz default now()
);

-- ─────────────────────────────────────────────
-- user_settings
-- Single-row app config (calorie target, bot time, etc.)
-- ─────────────────────────────────────────────
create table if not exists user_settings (
  id              uuid primary key default uuid_generate_v4(),
  calorie_target  int default 2800,
  checkin_time    text default '20:30',   -- HH:MM PT
  timezone        text default 'America/Los_Angeles',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Seed default settings row
insert into user_settings (id) values (uuid_generate_v4())
on conflict do nothing;

-- ─────────────────────────────────────────────
-- Row Level Security
-- Single-user app: lock everything to authenticated
-- ─────────────────────────────────────────────
alter table garmin_daily        enable row level security;
alter table garmin_activities   enable row level security;
alter table training_plan       enable row level security;
alter table nutrition_daily     enable row level security;
alter table daily_checkin       enable row level security;
alter table weekly_summaries    enable row level security;
alter table user_settings       enable row level security;

-- Authenticated users can read/write everything
create policy "auth_all" on garmin_daily       for all to authenticated using (true) with check (true);
create policy "auth_all" on garmin_activities  for all to authenticated using (true) with check (true);
create policy "auth_all" on training_plan      for all to authenticated using (true) with check (true);
create policy "auth_all" on nutrition_daily    for all to authenticated using (true) with check (true);
create policy "auth_all" on daily_checkin      for all to authenticated using (true) with check (true);
create policy "auth_all" on weekly_summaries   for all to authenticated using (true) with check (true);
create policy "auth_all" on user_settings      for all to authenticated using (true) with check (true);

-- Service role (used by sync jobs and Telegram webhook) bypasses RLS automatically.

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists idx_garmin_daily_date        on garmin_daily (date desc);
create index if not exists idx_garmin_activities_date   on garmin_activities (activity_date desc);
create index if not exists idx_training_plan_date       on training_plan (plan_date);
create index if not exists idx_nutrition_daily_date     on nutrition_daily (date desc);
create index if not exists idx_daily_checkin_date       on daily_checkin (date desc);
create index if not exists idx_weekly_summaries_week    on weekly_summaries (week_start desc);

-- ─────────────────────────────────────────────
-- updated_at trigger helper
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_garmin_daily_updated_at
  before update on garmin_daily
  for each row execute function update_updated_at();

create trigger trg_training_plan_updated_at
  before update on training_plan
  for each row execute function update_updated_at();

create trigger trg_nutrition_daily_updated_at
  before update on nutrition_daily
  for each row execute function update_updated_at();

create trigger trg_user_settings_updated_at
  before update on user_settings
  for each row execute function update_updated_at();
