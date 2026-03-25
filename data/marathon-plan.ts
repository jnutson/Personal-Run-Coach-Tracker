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
  { wk: 1,  date: 'Mar 16', phase: 'Recovery',  mi: 18, down: false },
  { wk: 2,  date: 'Mar 23', phase: 'Recovery',  mi: 20, down: false },
  { wk: 3,  date: 'Mar 30', phase: 'Base',       mi: 25, down: false },
  { wk: 4,  date: 'Apr 06', phase: 'Base',       mi: 27, down: false },
  { wk: 5,  date: 'Apr 13', phase: 'Base',       mi: 22, down: true  },
  { wk: 6,  date: 'Apr 20', phase: 'Base',       mi: 29, down: false },
  { wk: 7,  date: 'Apr 27', phase: 'Base',       mi: 31, down: false },
  { wk: 8,  date: 'May 04', phase: 'Base',       mi: 25, down: true  },
  { wk: 9,  date: 'May 11', phase: 'Base',       mi: 34, down: false, tuneUp: 'Colfax Denver Half Marathon (May 17) — fitness check, no taper' },
  { wk: 10, date: 'May 18', phase: 'Base',       mi: 37, down: false },
  { wk: 11, date: 'May 25', phase: 'Base',       mi: 30, down: true  },
  { wk: 12, date: 'Jun 01', phase: 'Threshold',  mi: 40, down: false },
  { wk: 13, date: 'Jun 08', phase: 'Threshold',  mi: 43, down: false },
  { wk: 14, date: 'Jun 15', phase: 'Threshold',  mi: 35, down: true,  tuneUp: 'Half marathon — target 1:35–1:38' },
  { wk: 15, date: 'Jun 22', phase: 'Threshold',  mi: 46, down: false },
  { wk: 16, date: 'Jun 29', phase: 'Threshold',  mi: 50, down: false },
  { wk: 17, date: 'Jul 06', phase: 'Threshold',  mi: 41, down: true  },
  { wk: 18, date: 'Jul 13', phase: 'Race-Spec',  mi: 52, down: false },
  { wk: 19, date: 'Jul 20', phase: 'Race-Spec',  mi: 54, down: false },
  { wk: 20, date: 'Jul 27', phase: 'Race-Spec',  mi: 44, down: true  },
  { wk: 21, date: 'Aug 03', phase: 'Race-Spec',  mi: 55, down: false },
  { wk: 22, date: 'Aug 10', phase: 'Race-Spec',  mi: 56, down: false },
  { wk: 23, date: 'Aug 17', phase: 'Race-Spec',  mi: 45, down: true,  tuneUp: '10K sub-46 or half sub-1:30' },
  { wk: 24, date: 'Aug 24', phase: 'Race-Spec',  mi: 55, down: false },
  { wk: 25, date: 'Aug 31', phase: 'Taper',      mi: 42, down: false },
  { wk: 26, date: 'Sep 07', phase: 'Taper',      mi: 32, down: false },
  { wk: 27, date: 'Sep 14', phase: 'Taper',      mi: 22, down: false },
  { wk: 28, date: 'Sep 21', phase: 'Taper',      mi: 16, down: false },
  { wk: 29, date: 'Sep 28', phase: 'Taper',      mi: 10, down: false },
  { wk: 30, date: 'Oct 05', phase: 'Race',        mi: 0,  down: false },
];

export const keySession: Record<number, KeySession> = {
  1: { title: 'Easy only ×4',             detail: 'HR <150 every run. Zero quality.' },
  2: { title: 'Easy + strides',            detail: '4–5×20sec strides Saturday only.' },
  3: { title: 'Long run 10mi',             detail: 'Easy 9:00–9:30/mi. Strides 2×/wk.' },
  4: { title: 'Long run 12mi',             detail: '8% build. Keep 80% easy.' },
  5: { title: 'Down week',                 detail: 'Long run 8mi. All runs reduced 20%.' },
  6: { title: 'Long run 13mi',             detail: 'Strides 2×/wk. Rebuilding.' },
  7: { title: 'Long 14mi + MP miles',      detail: 'Last 3mi @ 8:00–8:10/mi.' },
  8: { title: 'Down week',                 detail: 'Long 10mi easy. No quality.' },
};

// Weeks flagged for extra injury-watch attention
export const INJURY_WATCH_WEEKS = new Set([7,8,9,10,12,13,14,15,16,18,19,20,21,22]);

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
