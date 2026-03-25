-- Migration 008: Run club anchors + Colfax Denver Half Marathon
-- - Wed: Hermosa Run Club (4mi Wednesdays)
-- - Sat: Optional Venice Run Club (6-8mi easy)
-- - Sun: Hermosa Run Club long run
-- - May 17, 2026: Colfax Denver Half Marathon (week 9 tune-up)

BEGIN;

-- ── Wednesday: Hermosa Run Club note ──────────────────────────────────────────

-- Easy Wednesday runs → Hermosa Run Club, cap at 4mi (6.4km) for club nights
UPDATE training_plan
SET
  target_distance_km = 6.4,
  target_pace_desc   = 'Hermosa Run Club · 4mi easy, ~9:00–9:30/mi'
WHERE
  (plan_date - '2026-03-16'::date) % 7 = 2
  AND workout_type = 'easy'
  AND plan_date BETWEEN '2026-03-16' AND '2026-10-11'
  AND completed IS FALSE;

-- Tempo Wednesday runs → note club route as tempo vehicle
UPDATE training_plan
SET target_pace_desc = 'Hermosa Run Club route · ' || target_pace_desc
WHERE
  (plan_date - '2026-03-16'::date) % 7 = 2
  AND workout_type = 'tempo'
  AND plan_date BETWEEN '2026-03-16' AND '2026-10-11'
  AND completed IS FALSE;

-- Interval Wednesday runs → note club route
UPDATE training_plan
SET target_pace_desc = 'Hermosa Run Club route · ' || target_pace_desc
WHERE
  (plan_date - '2026-03-16'::date) % 7 = 2
  AND workout_type = 'intervals'
  AND plan_date BETWEEN '2026-03-16' AND '2026-10-11'
  AND completed IS FALSE;

-- ── Saturday: Optional Venice Run Club ────────────────────────────────────────
-- Change from rest to optional easy through week 28 (Sep 14 is start of wk 27)

UPDATE training_plan
SET
  workout_type       = 'easy',
  target_distance_km = 9.7,
  target_pace_desc   = 'optional · Venice Run Club · 6–8mi easy, ~9:00–9:30/mi'
WHERE
  (plan_date - '2026-03-16'::date) % 7 = 5
  AND workout_type = 'rest'
  AND plan_date BETWEEN '2026-03-16' AND '2026-09-21'
  AND completed IS FALSE;

-- ── Sunday: Hermosa Run Club long run note ────────────────────────────────────

UPDATE training_plan
SET target_pace_desc = 'Hermosa Run Club · ' || target_pace_desc
WHERE
  (plan_date - '2026-03-16'::date) % 7 = 6
  AND workout_type = 'long'
  AND plan_date BETWEEN '2026-03-16' AND '2026-10-11'
  AND completed IS FALSE;

-- ── Colfax Denver Half Marathon — Week 9 Sunday (May 17, 2026) ───────────────
-- Week 9 is Base phase, no taper → treat as fitness check, not goal race

UPDATE training_plan
SET
  workout_type       = 'race',
  target_distance_km = 21.1,
  target_pace_desc   = 'Colfax Denver Half Marathon · fitness benchmark · run ~8:00–8:20/mi easy (no taper — training run with bib)'
WHERE
  plan_date = '2026-05-17'
  AND completed IS FALSE;

COMMIT;
