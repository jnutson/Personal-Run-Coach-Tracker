-- Migration 007: Rebuild training_plan from March 16, 2026 (30-week plan)
-- Aligns DB with data/marathon-plan.ts (plan_start = Mar 16, race = Oct 12)
-- Adds 2 stationary bike sessions per week (Tue + Fri) through week 20 for injury recovery
-- Uses ON CONFLICT DO UPDATE so it's safe to re-run

BEGIN;

-- Clear rows within the plan window
DELETE FROM training_plan
WHERE plan_date >= '2026-03-16'::date AND plan_date <= '2026-10-18'::date;

DO $$
DECLARE
  plan_start DATE := '2026-03-16';
  wk         INT;
  ws         DATE;
  mi         NUMERIC;
  ph         TEXT;

  long_mi_v  NUMERIC;
  wed_mi_v   NUMERIC;
  easy_mi_v  NUMERIC;
  long_km    NUMERIC;
  wed_km     NUMERIC;
  easy_km    NUMERIC;

  -- Weekly mileage targets (matches data/marathon-plan.ts planWeeks)
  mi_targets NUMERIC[] := ARRAY[
    18, 20, 25, 27, 22, 29, 31, 25, 34, 37,   -- wks 1-10
    30, 40, 43, 35, 46, 50, 41, 52, 54, 44,   -- wks 11-20
    55, 56, 45, 55, 42, 32, 22, 16, 10,  0    -- wks 21-30
  ];

  -- Phases (matches data/marathon-plan.ts)
  wk_phases TEXT[] := ARRAY[
    'Recovery','Recovery','Base','Base','Base','Base','Base','Base','Base','Base',
    'Base','Threshold','Threshold','Threshold','Threshold','Threshold','Threshold',
    'Race-Spec','Race-Spec','Race-Spec','Race-Spec','Race-Spec','Race-Spec','Race-Spec',
    'Taper','Taper','Taper','Taper','Taper','Race'
  ];

BEGIN
  FOR wk IN 1..30 LOOP
    ws := plan_start + ((wk - 1) * 7);
    mi := mi_targets[wk];
    ph := wk_phases[wk];

    -- ── Race week (week 30) ────────────────────────────────────────────────────
    IF wk = 30 THEN
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 0, 'rest', NULL, NULL, FALSE),
        (ws + 1, 'easy', 3.2, 'Easy shakeout, ~9:30/mi, HR <145', FALSE),
        (ws + 2, 'rest', NULL, NULL, FALSE),
        (ws + 3, 'easy', 3.2, 'Easy shakeout, ~9:30/mi, HR <145', FALSE),
        (ws + 4, 'rest', NULL, NULL, FALSE),
        (ws + 5, 'rest', NULL, NULL, FALSE),
        (ws + 6, 'race', 42.2, 'Chicago Marathon · Goal 3:00:00 · 6:52/mi · negative split', FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
      CONTINUE;
    END IF;

    -- ── Compute run distances ──────────────────────────────────────────────────
    long_mi_v := LEAST(GREATEST(mi * 0.37, 8), 22);
    wed_mi_v  := mi * 0.22;
    easy_mi_v := GREATEST((mi - long_mi_v - wed_mi_v) / 2.0, 0);

    long_km := ROUND(long_mi_v * 1.60934, 1);
    wed_km  := ROUND(wed_mi_v  * 1.60934, 1);
    easy_km := ROUND(easy_mi_v * 1.60934, 1);

    -- ── MON: Easy run ─────────────────────────────────────────────────────────
    INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES (
      ws + 0, 'easy',
      CASE WHEN easy_km > 0 THEN easy_km ELSE NULL END,
      CASE ph
        WHEN 'Recovery'   THEN 'Easy aerobic, ~9:00–9:30/mi, HR <150'
        WHEN 'Base'       THEN 'Easy aerobic, ~9:00–9:30/mi'
        WHEN 'Threshold'  THEN 'Easy, ~8:20–8:45/mi'
        WHEN 'Race-Spec'  THEN 'Easy recovery, ~8:45–9:00/mi'
        WHEN 'Taper'      THEN 'Easy, ~9:00–9:30/mi'
        ELSE 'Easy run'
      END,
      FALSE
    )
    ON CONFLICT (plan_date) DO UPDATE
      SET workout_type = EXCLUDED.workout_type,
          target_distance_km = EXCLUDED.target_distance_km,
          target_pace_desc = EXCLUDED.target_pace_desc
      WHERE training_plan.completed IS FALSE;

    -- ── TUE: Stationary bike (wks 1-20) | Easy run (wks 21+) ─────────────────
    IF wk <= 20 THEN
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 1, 'bike', NULL, '30–45 min easy stationary bike · injury recovery', FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    ELSE
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 1, 'easy', easy_km, 'Easy aerobic, ~8:45–9:00/mi', FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    END IF;

    -- ── WED: Quality session (phase-dependent) ─────────────────────────────────
    -- Tune-up race weeks 14 and 23 → race instead
    IF wk = 14 THEN
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 2, 'rest', NULL, 'Tune-up race prep — off feet', FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    ELSIF wk = 23 THEN
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 2, 'rest', NULL, 'Tune-up race prep — off feet', FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    ELSE
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES (
        ws + 2,
        CASE ph
          WHEN 'Recovery'  THEN 'easy'
          WHEN 'Base'      THEN 'easy'
          WHEN 'Threshold' THEN 'tempo'
          WHEN 'Race-Spec' THEN CASE WHEN wk <= 20 THEN 'tempo' ELSE 'intervals' END
          WHEN 'Taper'     THEN 'easy'
          ELSE 'easy'
        END,
        wed_km,
        CASE ph
          WHEN 'Recovery'  THEN 'Easy aerobic, ~9:00–9:30/mi'
          WHEN 'Base'      THEN 'Easy with 4–6×20s strides, ~9:00–9:30/mi'
          WHEN 'Threshold' THEN 'Tempo — 2mi warmup · 4–6mi @ 7:15–7:45/mi · 2mi cooldown'
          WHEN 'Race-Spec' THEN
            CASE WHEN wk <= 20
              THEN 'MP workout — 4×2mi @ goal MP (6:52/mi) w/ 90s jog recovery'
              ELSE 'Yasso 800s — 8–10×800m @ 6:40–6:50/mi w/ equal jog recovery'
            END
          WHEN 'Taper'     THEN 'Easy with 4×100m race-pace strides (6:52/mi)'
          ELSE 'Easy run'
        END,
        FALSE
      )
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    END IF;

    -- ── THU: Easy run or Rest ──────────────────────────────────────────────────
    -- Rest on low-mileage weeks (≤22mi) or taper end
    IF easy_km <= 0 OR mi <= 22 THEN
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 3, 'rest', NULL, NULL, FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    ELSE
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES (
        ws + 3, 'easy', easy_km,
        CASE ph
          WHEN 'Recovery'  THEN 'Easy aerobic, ~9:00–9:30/mi'
          WHEN 'Base'      THEN 'Easy aerobic, ~9:00–9:30/mi'
          WHEN 'Threshold' THEN 'Easy, ~8:20–8:45/mi'
          WHEN 'Race-Spec' THEN 'Easy recovery, ~9:00/mi'
          WHEN 'Taper'     THEN 'Easy, ~9:00–9:30/mi'
          ELSE 'Easy run'
        END,
        FALSE
      )
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    END IF;

    -- ── FRI: Stationary bike (wks 1-20) | Easy run (wks 21-26) | Rest (wks 27+) ──
    IF wk <= 20 THEN
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 4, 'bike', NULL, '30–45 min easy stationary bike · injury recovery', FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    ELSIF mi > 30 THEN
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 4, 'easy', easy_km, 'Easy aerobic, ~8:45–9:00/mi', FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    ELSE
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 4, 'rest', NULL, NULL, FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    END IF;

    -- ── SAT: Rest ──────────────────────────────────────────────────────────────
    INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
      (ws + 5, 'rest', NULL, NULL, FALSE)
    ON CONFLICT (plan_date) DO UPDATE
      SET workout_type = EXCLUDED.workout_type,
          target_distance_km = EXCLUDED.target_distance_km,
          target_pace_desc = EXCLUDED.target_pace_desc
      WHERE training_plan.completed IS FALSE;

    -- ── SUN: Long run (or tune-up race for wks 14 & 23) ──────────────────────
    IF wk = 14 THEN
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 6, 'race', 21.1, 'Tune-up half marathon · target 1:35–1:38 · ~7:15/mi', FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    ELSIF wk = 23 THEN
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES
        (ws + 6, 'race', 10.0, 'Tune-up 10K · target sub-46:00 · or half sub-1:30', FALSE)
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    ELSE
      INSERT INTO training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, completed) VALUES (
        ws + 6, 'long', long_km,
        CASE ph
          WHEN 'Recovery'  THEN 'Long run · easy 9:00–9:30/mi · HR <150 throughout'
          WHEN 'Base'      THEN
            CASE WHEN wk >= 7
              THEN 'Long run · easy 9:00–9:30/mi · last 3mi @ 8:00–8:10/mi'
              ELSE 'Long run · easy 9:00–9:30/mi'
            END
          WHEN 'Threshold' THEN 'Long run · first half easy · last 4–6mi @ 8:00–8:10/mi'
          WHEN 'Race-Spec' THEN 'Long run · miles 8–14 @ goal MP (6:52/mi) · easy bookends'
          WHEN 'Taper'     THEN 'Long run · easy 9:00–9:30/mi · feel-good effort'
          ELSE 'Long run'
        END,
        FALSE
      )
      ON CONFLICT (plan_date) DO UPDATE
        SET workout_type = EXCLUDED.workout_type,
            target_distance_km = EXCLUDED.target_distance_km,
            target_pace_desc = EXCLUDED.target_pace_desc
        WHERE training_plan.completed IS FALSE;
    END IF;

  END LOOP;
END $$;

COMMIT;
