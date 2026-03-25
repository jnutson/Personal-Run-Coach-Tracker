-- Marathon Training Plan — 18 weeks leading to late October 2026
-- Target race: Oct 25, 2026 (adjust as needed)
-- Week 1 start: Jun 29, 2026
-- Pattern: Mon=Easy, Tue=Intervals/Tempo, Wed=Easy, Thu=Tempo/Easy, Fri=Rest, Sat=Long, Sun=Recovery

do $$
declare
  race_date date := '2026-10-25';
  plan_start date := race_date - interval '17 weeks'; -- 18-week plan
  w int;
  d int;
  cur_date date;
  wtype text;
  dist numeric;
  pace_desc text;
begin
  for w in 0..17 loop
    for d in 0..6 loop
      cur_date := plan_start + (w * 7 + d);

      -- Skip if this date is race day or beyond
      if cur_date > race_date then
        continue;
      end if;

      -- Race day
      if cur_date = race_date then
        wtype := 'race';
        dist := 42.2;
        pace_desc := 'RACE DAY — Marathon!';
      -- Taper weeks (last 2 weeks): reduce volume
      elsif w >= 16 then
        case d
          when 0 then wtype := 'easy';      dist := 5;  pace_desc := 'Easy taper run';
          when 1 then wtype := 'easy';      dist := 6;  pace_desc := 'Easy with strides';
          when 2 then wtype := 'rest';      dist := 0;  pace_desc := 'Rest / cross-train';
          when 3 then wtype := 'easy';      dist := 5;  pace_desc := 'Easy effort';
          when 4 then wtype := 'rest';      dist := 0;  pace_desc := 'Rest';
          when 5 then wtype := 'long';      dist := case when w = 16 then 19 else 10 end;
                      pace_desc := case when w = 16 then 'Long easy run' else 'Pre-race shakeout' end;
          else       wtype := 'rest';      dist := 0;  pace_desc := 'Rest / walk';
        end case;
      -- Peak week (week 14-15)
      elsif w >= 14 then
        case d
          when 0 then wtype := 'easy';      dist := 10; pace_desc := 'Easy aerobic run';
          when 1 then wtype := 'intervals'; dist := 13; pace_desc := '2mi warm-up + 6×1km @ 5K pace + 2mi cool-down';
          when 2 then wtype := 'easy';      dist := 10; pace_desc := 'Easy recovery run';
          when 3 then wtype := 'tempo';     dist := 16; pace_desc := '3mi warm-up + 8mi MP + 3mi cool-down';
          when 4 then wtype := 'rest';      dist := 0;  pace_desc := 'Rest';
          when 5 then wtype := 'long';      dist := 32; pace_desc := '32km long run at easy-to-MP pace';
          else       wtype := 'easy';      dist := 8;  pace_desc := 'Active recovery';
        end case;
      -- Build phase (weeks 6-13)
      elsif w >= 6 then
        case d
          when 0 then wtype := 'easy';      dist := 8 + (w-6);  pace_desc := 'Easy aerobic';
          when 1 then wtype := 'intervals'; dist := 10; pace_desc := '2km warm-up + intervals + 2km cool-down';
          when 2 then wtype := 'easy';      dist := 8;  pace_desc := 'Easy recovery';
          when 3 then wtype := 'tempo';     dist := 12 + (w-6); pace_desc := 'MP pace tempo run';
          when 4 then wtype := 'rest';      dist := 0;  pace_desc := 'Rest';
          when 5 then wtype := 'long';      dist := 19 + (w-6); pace_desc := 'Long easy run — conversational pace';
          else       wtype := 'easy';      dist := 6;  pace_desc := 'Recovery run or rest';
        end case;
      -- Base phase (weeks 0-5)
      else
        case d
          when 0 then wtype := 'easy';      dist := 6 + w; pace_desc := 'Easy aerobic base';
          when 1 then wtype := 'easy';      dist := 8;     pace_desc := 'Easy with strides';
          when 2 then wtype := 'easy';      dist := 6;     pace_desc := 'Easy recovery';
          when 3 then wtype := 'tempo';     dist := 10;    pace_desc := 'Steady state / tempo effort';
          when 4 then wtype := 'rest';      dist := 0;     pace_desc := 'Rest';
          when 5 then wtype := 'long';      dist := 14 + w; pace_desc := 'Long run — easy effort';
          else       wtype := 'easy';      dist := 5;     pace_desc := 'Recovery run';
        end case;
      end if;

      insert into training_plan (plan_date, workout_type, target_distance_km, target_pace_desc, notes)
      values (
        cur_date,
        wtype,
        case when dist = 0 then null else dist end,
        pace_desc,
        'Week ' || (w+1) || ' of 18 — auto-generated plan'
      )
      on conflict (plan_date) do nothing;

    end loop;
  end loop;
end;
$$;
