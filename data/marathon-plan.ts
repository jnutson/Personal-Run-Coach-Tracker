export type Phase = 'Recovery' | 'Base' | 'Threshold' | 'Race-Spec' | 'Taper' | 'Race';

export interface PlanWeek {
  wk: number;
  date: string;
  phase: Phase;
  mi: number;
  down: boolean;
  tuneUp?: string;
}

export interface KeySession {
  title: string;
  detail: string;
}

import { marathon as marathonConfig } from "@/config/user";

// Derived from config/user.ts — edit planStartDate / raceDate there.
// NOTE: planWeeks[].date strings below (e.g. "Mar 16") are display labels
// pre-computed from the Mar 16 plan start. If you change planStartDate,
// regenerate those strings to match.
export const PLAN_START = new Date(marathonConfig.planStartDate + 'T00:00:00');
export const RACE_DATE  = new Date(marathonConfig.raceDate      + 'T00:00:00');

export const planWeeks: PlanWeek[] = [
  // ── Pre-injury (plan week 1 completed as-is) ────────────────────────────────
  { wk: 1,  date: 'Mar 16', phase: 'Recovery',  mi: 18, down: false },

  // ── Shin splint no-run period (Mar 23 – Apr 10) — cross-train only ──────────
  { wk: 2,  date: 'Mar 23', phase: 'Recovery',  mi: 0,  down: false },
  { wk: 3,  date: 'Mar 30', phase: 'Recovery',  mi: 0,  down: false },
  { wk: 4,  date: 'Apr 06', phase: 'Recovery',  mi: 0,  down: false },

  // ── Return to running — 10% weekly build from 10mi ──────────────────────────
  { wk: 5,  date: 'Apr 13', phase: 'Recovery',  mi: 10, down: false },
  { wk: 6,  date: 'Apr 20', phase: 'Recovery',  mi: 11, down: false },
  { wk: 7,  date: 'Apr 27', phase: 'Base',       mi: 12, down: false },
  { wk: 8,  date: 'May 04', phase: 'Base',       mi: 10, down: true  },
  { wk: 9,  date: 'May 11', phase: 'Base',       mi: 15, down: false, tuneUp: '⚠️ Colfax (May 17) — skip racing, run as easy long run only. Too soon post-injury.' },
  { wk: 10, date: 'May 18', phase: 'Base',       mi: 17, down: false },
  { wk: 11, date: 'May 25', phase: 'Base',       mi: 14, down: true  },

  // ── Threshold — tempo & lactate work introduced ──────────────────────────────
  { wk: 12, date: 'Jun 01', phase: 'Threshold',  mi: 20, down: false },
  { wk: 13, date: 'Jun 08', phase: 'Threshold',  mi: 22, down: false },
  { wk: 14, date: 'Jun 15', phase: 'Threshold',  mi: 18, down: true,  tuneUp: 'Half marathon ~Jun 21 — treat as hard long run, target 1:40–1:45 (adjusted for fitness)' },
  { wk: 15, date: 'Jun 22', phase: 'Threshold',  mi: 27, down: false },
  { wk: 16, date: 'Jun 29', phase: 'Threshold',  mi: 30, down: false },
  { wk: 17, date: 'Jul 06', phase: 'Threshold',  mi: 24, down: true  },

  // ── Race-Spec — MP miles, back-to-back longs, lactate threshold ──────────────
  { wk: 18, date: 'Jul 13', phase: 'Race-Spec',  mi: 36, down: false },
  { wk: 19, date: 'Jul 20', phase: 'Race-Spec',  mi: 40, down: false },
  { wk: 20, date: 'Jul 27', phase: 'Race-Spec',  mi: 32, down: true  },
  { wk: 21, date: 'Aug 03', phase: 'Race-Spec',  mi: 46, down: false },
  { wk: 22, date: 'Aug 10', phase: 'Race-Spec',  mi: 50, down: false },
  { wk: 23, date: 'Aug 17', phase: 'Race-Spec',  mi: 40, down: true,  tuneUp: '10K sub-46 or half sub-1:30 (~Aug 23) — peak fitness check' },
  { wk: 24, date: 'Aug 24', phase: 'Race-Spec',  mi: 50, down: false },
  { wk: 25, date: 'Aug 31', phase: 'Race-Spec',  mi: 52, down: false },

  // ── Taper ────────────────────────────────────────────────────────────────────
  { wk: 26, date: 'Sep 07', phase: 'Taper',      mi: 36, down: false },
  { wk: 27, date: 'Sep 14', phase: 'Taper',      mi: 26, down: false },
  { wk: 28, date: 'Sep 21', phase: 'Taper',      mi: 18, down: false },
  { wk: 29, date: 'Sep 28', phase: 'Taper',      mi: 12, down: false },
  { wk: 30, date: 'Oct 05', phase: 'Race',        mi: 0,  down: false },
];

export const keySession: Record<number, KeySession> = {
  // Pre-injury
  1:  { title: 'Easy only ×4',               detail: 'HR <150 every run. Zero quality.' },

  // No-run injury period
  2:  { title: '🚫 No running',              detail: 'Shin splints. Pool run, bike, or elliptical daily. Zero impact.' },
  3:  { title: '🚫 No running',              detail: 'Shin splints. Cross-train 30–45min/day. Rest shins completely.' },
  4:  { title: '🚫 No running',              detail: 'No run through Apr 10. Reintroduce only if zero shin pain.' },

  // Return to running
  5:  { title: 'Return — easy only',          detail: 'Max 3mi per run. HR <145. Stop at any shin pain. 10mi total.' },
  6:  { title: 'Easy + light strides',        detail: '4×15sec strides Wed & Sat only. All runs HR <150.' },
  7:  { title: 'First long run — 8mi',        detail: 'Easy 9:30/mi. No quality. Monitor shins closely.' },
  8:  { title: 'Down week',                   detail: 'Long run 6mi. All easy. Shin check before increasing.' },
  9:  { title: '⚠️ Colfax week',             detail: 'Skip racing. Run Colfax as easy long run (10–11mi). No race effort.' },
  10: { title: 'Long run 10mi easy',          detail: '9:00–9:30/mi. Introduce 2×20sec strides mid-week.' },
  11: { title: 'Down week',                   detail: 'Long run 8mi. Full easy. Shin check before threshold phase.' },

  // Threshold
  12: { title: 'First tempo — 20min',         detail: '20min @ 7:45/mi threshold. Long run 12mi easy.' },
  13: { title: 'Tempo 25min + long 13mi',     detail: '25min @ 7:40/mi. Long run easy first 10, last 3 @ 8:00/mi.' },
  14: { title: 'Half marathon — down week',   detail: 'Race as hard long run effort only. Do not taper or race all-out.' },
  15: { title: 'Cruise intervals + long 14mi',detail: '3×10min @ 7:30/mi, 90sec jog. Long run 14mi easy.' },
  16: { title: 'Tempo 2×15min + long 16mi',  detail: '2×15min @ 7:25/mi. Long 16mi — last 4mi @ 8:00/mi.' },
  17: { title: 'Down week',                   detail: 'Long run 12mi. No quality. Prep for Race-Spec block.' },

  // Race-Spec
  18: { title: 'MP miles — long 18mi',        detail: 'Long 18mi: first 14 easy, last 4 @ 6:52/mi (goal MP).' },
  19: { title: 'Long 19mi w/ 5mi@MP',         detail: 'Last 5mi @ 6:52/mi. Mid-week 8mi w/ 3×1mi @ 6:45.' },
  20: { title: 'Down week',                   detail: 'Long 14mi easy. Absorb peak load before final push.' },
  21: { title: 'Long 20mi first peak',        detail: '20mi: miles 15–20 @ 7:10–7:20/mi (MP+20). Big week — trust the process.' },
  22: { title: 'Long 21mi — peak build',      detail: '21mi easy. Mid-week: 10mi w/ 4×2mi @ 7:00/mi.' },
  23: { title: 'Down + tune-up race',         detail: '10K or half (~Aug 23). Race hard — this is the real fitness test.' },
  24: { title: 'Long 20mi final peak',        detail: '20mi: last 6mi @ goal MP. This is your confidence run.' },
  25: { title: 'Peak week — 52mi',            detail: 'Long 20mi easy. Highest mileage of the plan. Begin taper next week.' },

  // Taper
  26: { title: 'Taper begins — 36mi',         detail: 'Long 16mi easy. Keep intensity, drop volume. No new workouts.' },
  27: { title: 'Taper — 26mi',                detail: 'Long 12mi easy. 2×3mi @ MP mid-week. Legs should feel fresh.' },
  28: { title: 'Taper — 18mi',                detail: 'Long 10mi. Shakeout runs only. Mental prep week.' },
  29: { title: 'Race week shakeouts',          detail: '3–4 easy runs of 3–4mi. 4×100m strides Wed. Rest Thu–Fri.' },
  30: { title: '🏆 Chicago Marathon Oct 12',  detail: 'Goal: 3:00. Strategy: 1:31 first half, 1:29 second half. Gel every 45min.' },
};

// Weeks flagged for extra shin-splint injury-watch attention (return-to-run phase is highest risk)
export const INJURY_WATCH_WEEKS = new Set([5,6,7,8,9,10,11,12,13,18,19,21,22]);

export const PHASE_BAR_COLOR: Record<Phase, string> = {
  Recovery:  '#94a3b8',
  Base:      '#3b82f6',
  Threshold: '#a855f7',
  'Race-Spec': '#f97316',
  Taper:     '#22c55e',
  Race:      '#16a34a',
};

export const PHASE_BADGE: Record<Phase, string> = {
  Recovery:    'bg-slate-100 text-slate-600',
  Base:        'bg-blue-100 text-blue-700',
  Threshold:   'bg-purple-100 text-purple-700',
  'Race-Spec': 'bg-orange-100 text-orange-700',
  Taper:       'bg-green-100 text-green-700',
  Race:        'bg-green-200 text-green-800',
};

// paceZones moved to config/user.ts → marathon.paceZones
// Import from "@/config/user" where needed.

export const injuryProtocols = {
  daily: [
    '5–10 min dynamic warmup before every run (leg swings, hip circles, high knees)',
    'Calf raises ×20 and hip flexor stretch after each run',
    'Foam roll calves, IT band, and glutes — 60 sec per side',
    'Stay hydrated: minimum 80 oz/day, more on long run days',
    'Check for hotspots: shins, Achilles, knees. Rate soreness 1–10 before running.',
  ],
  postRun: [
    '10 min walk cool-down — non-negotiable on hard efforts',
    'Static stretching: hamstrings, quads, hip flexors — 30 sec/stretch × 2',
    'Ice any tendon soreness within 20 min if rating ≥ 4/10',
    'Log any pain in journal so patterns are visible week-over-week',
    'Elevate legs 10 min after runs ≥ 14mi',
  ],
  weeklyStrength: [
    'Single-leg deadlifts — 3×10 each leg',
    'Clamshells (resistance band) — 3×15 each side',
    'Hip bridges / glute bridges — 3×15',
    'Eccentric calf raises (slow down, 3 sec) — 3×15',
    'Lateral band walks — 3×12 each direction',
    'Copenhagen adductor plank — 3×10 each side',
  ],
};
