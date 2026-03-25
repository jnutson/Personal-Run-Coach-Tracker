-- Migration 009: Add wear_hours to garmin_daily
-- Tracks how many hours per day the Garmin watch was worn and recording data.
-- Computed from Garmin's activeSeconds + highlyActiveSeconds + sedentarySeconds
-- (daytime wear; sleep is already tracked as sleep_duration).

ALTER TABLE garmin_daily
  ADD COLUMN IF NOT EXISTS wear_hours numeric(4,1);
