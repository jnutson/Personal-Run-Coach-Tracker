-- Migration 010: Sync user_settings to match config/user.ts (canonical source of truth)
--
-- Resolves 3-way mismatch between data/marathon-plan.ts, migration 005, and the UI:
--   Before: goal_race_date = '2026-10-25', plan_start_date = '2026-06-29', goal_race_time = '3:45:00'
--   After:  all aligned with config/user.ts values

UPDATE user_settings SET
  goal_race_time  = '3:00:00',
  goal_race_date  = '2026-10-12',
  plan_start_date = '2026-03-16';
