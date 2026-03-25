-- Add marathon goal + plan schedule to user_settings.
-- These drive the plan-context agent tool so the agent understands
-- where Josh is in the arc and what the downstream implications of
-- any plan change are.

alter table user_settings
  add column if not exists goal_race_time  text default '3:00:00',   -- target finish time
  add column if not exists goal_race_date  date default '2026-10-25', -- race day
  add column if not exists plan_start_date date default '2026-06-29'; -- week 1 day 1

-- Seed the values into the existing row
update user_settings set
  goal_race_time  = '3:00:00',
  goal_race_date  = '2026-10-25',
  plan_start_date = '2026-06-29';
