---
name: marathon-plan
description: >
  Rewrites or updates Josh's marathon training plan with full awareness of his athletic profile,
  race goals, and sports science principles. Use this skill whenever Josh asks to update, rebuild,
  regenerate, or tweak his marathon plan, training schedule, race-day strategy, pacing plan, or
  fueling protocol — even if he just says "redo my plan", "adjust my training", or "update my
  marathon prep". Also trigger when he mentions changes to his fitness, injury status, race date,
  or goal time. This skill provides all the background context the agent needs so Josh doesn't
  have to re-explain himself every time.
---

# Marathon Plan Skill

This skill gives the Claude Code agent everything it needs to rewrite or update Josh's marathon
training plan from scratch — without Josh needing to re-explain his background each time.

---

## Step 1: Load Josh's Athlete Profile

Before writing anything, internalize the full profile in `references/athlete-profile.md`. It
contains Josh's training history, current fitness data, race goal, and pacing/fueling strategy.
Read it now if you haven't already.

## Step 2: Load Domain Knowledge

Use the marathon training domain knowledge embedded at the bottom of this file (§ Domain Knowledge).
Apply it to make the plan evidence-based, not generic.

## Step 3: Understand the Request

Determine what Josh is asking for:
- **Full rewrite**: Rebuild the entire plan from today through race day
- **Segment update**: Adjust a specific phase (e.g. taper, peak week)
- **Race-day strategy only**: Revise pacing or fueling plan without touching training weeks
- **Injury/schedule accommodation**: Adapt around a new constraint

If the request is ambiguous, check Strava data if available, otherwise ask one clarifying question.

## Step 4: Generate the Plan

Structure the output based on request type. For a **full plan**, use this structure:

### Plan Output Format

```
## Josh's Marathon Training Plan
**Race**: [Race name and date]
**Goal**: [Finish time] | **Adjusted Prediction**: [range based on data]
**Current Week**: [Week X of Y]

---

### Phase Overview
[Brief narrative of training arc: base → build → peak → taper]

---

### Weekly Schedule (Week-by-week)
For each week:
- **Week N** | [Phase] | [Total mileage] | [Key focus]
  - Mon: [workout]
  - Tue: [workout]
  - ...
  - Long Run: [distance + pace guidance]

---

### Race-Day Execution Plan
**Pacing Strategy**: [mile splits or segment targets]
**Fueling Protocol**: [gel/chew schedule with mile markers]
**Key Mental Cues**: [2-3 race-specific reminders]
**Weather/Conditions Contingency**: [adjust if hot/cold/windy]

---

### Notes & Flags
[Anything coach-worthy: injury watch, form reminders, recovery priorities]
```

## Step 5: Calibration Principles

Always apply these when writing the plan:
- **Negative split bias**: Build Josh toward a conservative first half
- **Long run pacing**: Easy aerobic — no more than 60-90 sec/mile slower than goal pace
- **Fueling anchored to his protocol**: Honey Stinger gels ~every 45 min, Salt Stick chews for
  electrolytes, Maurten caffeine gel at mile 18
- **Strava-informed**: If Strava data is available in context, reference actual paces/distances
  rather than estimates
- **Data-driven honesty**: If his data suggests a gap between goal and realistic outcome, say so
  clearly but constructively (e.g. "Best case: 3:38-3:42, likely range: 3:45-3:52")

---

## Output Style

- Practical and direct — Josh is analytical, not looking for cheerleading
- Use tables or structured lists where they add clarity
- Flag trade-offs (e.g. "cutting this run protects your hip but reduces peak mileage by ~10%")
- Keep it coach-like: confident, evidence-based, personalized

---

## Josh's Fixed Schedule Anchors

These are non-negotiable weekly anchors the plan must respect:

| Day | Commitment | Notes |
|-----|-----------|-------|
| **Wednesday** | Hermosa Run Club — 4 miles easy | Fixed. If the training plan calls for more mileage on Wed, warmup/cooldown around the club run |
| **Saturday** | Venice Run Club — 6–8 miles easy | Optional (attend when energy/schedule allows). Rest if recovery priority |
| **Sunday** | Hermosa Run Club — longer runs | Primary long run vehicle. Distance driven by plan |

### Key Tune-up Races

| Race | Date | Week | Notes |
|------|------|------|-------|
| Colfax Denver Half Marathon | ~May 17, 2026 | Week 9 | Fitness benchmark — no taper, run easy (8:00–8:20/mi) |
| Tune-up Half Marathon | ~Jun 21, 2026 | Week 14 | First real fitness test, target 1:33–1:38 |
| 10K or Half Marathon | ~Aug 23, 2026 | Week 23 | Race-pace effort, target sub-46:00 (10K) / sub-1:30 (half) |
| **LA Marathon** | **Oct 12, 2026** | **Week 30** | **A-race — goal 3:15** |

---

## Domain Knowledge

### Periodization Principles

#### Phase Structure (standard 16–20 week plan)
1. **Base Phase** (weeks 1–6): Aerobic foundation, low intensity, building mileage gradually
2. **Build Phase** (weeks 7–12): Introduce tempo runs, progression long runs, and lactate threshold work
3. **Peak Phase** (weeks 13–16): Highest mileage, race-pace work, back-to-back long runs
4. **Taper Phase** (weeks 17–20 or final 3 weeks): Volume drops ~30–40%, intensity maintained, rest and adaptation

#### Weekly Mileage Guidelines
- Most recreational marathon runners peak at 40–55 miles/week
- 10% rule: don't increase weekly mileage by more than 10% per week
- Every 3rd or 4th week: drop mileage by 20–30% for recovery

---

### Long Run Structure

- Long runs should be ~20–30% of weekly mileage
- Pace: 60–90 sec/mile slower than goal marathon pace (easy, conversational)
- Peak long run: 20–22 miles, typically 3–4 weeks before race day
- One or two "progression long runs" in build phase: start easy, finish at goal pace last 4–6 miles
- Fueling during long runs: practice race-day nutrition (no new products on race day)

---

### Pacing Strategy

#### Negative Split
- Run first half ~1–2% slower than second half
- For a 3:15 goal: first half ~1:39, second half ~1:36
- Protects glycogen, avoids blowing up at miles 18–22

#### Common Mistakes
- Going out too fast (crowd energy, fresh legs)
- Banking time early — it rarely works, usually backfires
- Ignoring heart rate and relying only on pace in heat

#### LA Marathon Specific
- Course profile: generally downhill early (Dodger Stadium to Santa Monica)
- Miles 1–13: Easy, save energy despite downhill temptation
- Miles 14–20: Steady, hold form
- Miles 20–26: Push only if you feel good; if struggling, hold pace

---

### Fueling & Hydration

#### Carbohydrate Needs
- ~30–60g carbs per hour for runs under 2.5 hours
- ~60–90g carbs per hour for runs over 2.5 hours (requires mixed transporters: glucose + fructose)
- Most gels: 20–25g carbs each; target 1 gel every 30–45 min for longer efforts

#### Honey Stinger Gels
- ~21–26g carbs per gel
- Easy on GI system for most runners
- Take with water, not sports drink (to avoid over-sugaring)

#### Salt Stick Chews / Electrolytes
- Sodium replacement critical after ~60 min of sweating
- Aim for 300–500mg sodium/hour in warm conditions
- Hyponatremia (too little sodium) is a real risk if drinking water without electrolytes

#### Maurten Caffeine Gel (Mile 18)
- Contains 100mg caffeine + Maurten hydrogel formula
- Caffeine peak: ~30–45 min post-ingestion → optimal effect around mile 21–23
- Do not take if caffeine-naive or if GI sensitivity is a concern in races
- Maurten hydrogel reduces GI distress risk vs. traditional gels

#### Hydration
- Drink to thirst; don't over-drink
- ~400–800ml per hour depending on sweat rate and conditions
- Hot days in LA: lean toward upper end

---

### Taper

#### Principles
- Volume drops ~40% final 3 weeks while intensity is maintained
- Some runners experience "taper madness" — feeling sluggish, anxious, heavy legs; this is normal
- Sleep, nutrition, and stress management matter more during taper than at any other time
- No new shoes, new food, new workouts during final 2 weeks

#### Sample Taper Schedule (3 weeks out)
- Week 3 before race: ~70% of peak volume
- Week 2 before race: ~50% of peak volume
- Race week: ~30% of peak volume, race on Saturday/Sunday

---

### Lactate Threshold & Tempo Work

- **Tempo runs**: Comfortably hard effort — "could speak in short sentences"
- Pace: ~15–25 sec/mile slower than 10K race pace
- Typical session: 20–40 min continuous at tempo pace, or cruise intervals (e.g. 3×10 min)
- Builds the ability to sustain marathon pace comfortably

---

### Recovery

- Easy days: truly easy (HR zone 2 or lower)
- Sleep: 8+ hours during peak training weeks
- Post-long run: protein + carbs within 30–45 min
- Rolling/stretching: especially calves, IT band, hip flexors
- Warning signs of overtraining: elevated resting HR, persistent fatigue, declining paces at same effort

---

### Predicting Finish Time

#### Common Formulas
- **Riegel formula**: T2 = T1 × (D2/D1)^1.06
  - Example: 1:45 half marathon → ~3:41 full marathon
- **McMillan / Vdot calculators**: Use recent race or long run data for projection
- Strava fitness data and recent long run pace are the most reliable real-world indicators

#### Josh's Context
- Goal: 3:00 (ambitious, requires near-perfect execution)
- Predicted range: 3:15–3:30 based on training data
- **A-goal: 3:15** — plan should be written to this target with honest checkpoints throughout training to reassess if data warrants adjusting expectations