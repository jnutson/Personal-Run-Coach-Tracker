-- Add water_cups to daily_checkin.
-- Hydration is now tracked via the /survey Telegram command instead of Cronometer.
-- Stored as a float to allow half-cup precision (e.g. 7.5), displayed as whole number in UI.

alter table daily_checkin
  add column if not exists water_cups numeric(4,1);
