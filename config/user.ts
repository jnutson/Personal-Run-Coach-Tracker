// ─────────────────────────────────────────────────────────────────────────────
// config/user.ts — Personal Tracker user configuration
//
// Fork this repo, edit this file + fill in .env.local, and you have your own
// working personal health & training dashboard. No other source files need to
// change for basic personalisation.
//
// After editing:
//   1. Run the latest Supabase migration (010_sync_settings_to_config.sql)
//      so the agent tools pick up your race date & goal time from the DB.
//   2. Push to Vercel: `vercel --prod`
// ─────────────────────────────────────────────────────────────────────────────

// ── Branding ──────────────────────────────────────────────────────────────────
// Affects: sidebar header, sidebar footer, browser <title>, HTML meta description,
//          and all Claude AI coach prompts.

export const branding = {
  /** App name shown in the sidebar, browser tab, and page titles. */
  appName: "Nutty Tracker",

  /** Your name — injected into all AI coach prompts ("You are [name]'s coach…"). */
  userName: "Josh Nutson",

  /** One-line description used in the HTML <meta description> tag. */
  appDescription: "Josh Nutson — personal wellness OS",
} as const;

// ── Marathon / Race ───────────────────────────────────────────────────────────
// Affects: app/(dashboard)/marathon/page.tsx, app/(dashboard)/home/page.tsx,
//          data/marathon-plan.ts (PLAN_START / RACE_DATE exports),
//          all /api/agent/* routes, and /api/weekly-summary.

export const marathon = {
  /**
   * Display name of your target race — shown on the Marathon page hero card
   * and injected into AI coach prompts.
   */
  raceName: "Chicago Marathon 2026",

  /**
   * Race date in YYYY-MM-DD format. This is the single source of truth:
   * - Marathon page countdown
   * - data/marathon-plan.ts RACE_DATE export
   * - AI coach prompts (race name + date context)
   * - user_settings DB fallback in api/agent/plan-context
   * Run migration 010 after changing this to keep the DB in sync.
   */
  raceDate: "2026-10-12",

  /**
   * First day of week 1 of your 30-week training plan (YYYY-MM-DD).
   * - data/marathon-plan.ts PLAN_START export
   * - home/page.tsx plan phase calculation
   * - user_settings DB fallback in api/agent/plan-context
   * NOTE: planWeeks[].date display labels in data/marathon-plan.ts are
   * pre-computed strings (e.g. "Mar 16"). If you change planStartDate,
   * regenerate those labels manually to match.
   * Run migration 010 after changing this to keep the DB in sync.
   */
  planStartDate: "2026-03-16",

  /**
   * A-goal finish time in HH:MM:SS format.
   * - Marathon page goal card
   * - All AI coach prompts
   * - user_settings DB fallback in api/agent/plan-context
   * Run migration 010 after changing this to keep the DB in sync.
   */
  goalTime: "3:00:00",

  /**
   * Your current marathon personal record in HH:MM:SS format.
   * Shown on the Marathon page PR card.
   */
  currentPR: "4:01:00",

  /**
   * Regular group runs or run clubs you attend. Injected into the weekly AI
   * coach prompt so it can reason around your real schedule constraints.
   */
  runClubs: [
    "Hermosa Wed (4mi)",
    "Venice Sat (optional 6-8mi)",
    "Hermosa Sun (long runs)",
  ],

  /**
   * Tune-up races within the 30-week plan.
   * - week: which plan week the race falls in (used to tag planWeeks[])
   * - date: display string shown on the Marathon page race card
   * - name: race name
   * - goal: target or context description
   * These render as cards on the Marathon page and inform AI context.
   */
  tuneUpRaces: [
    {
      week: 9,
      date: "May 17",
      name: "Colfax Denver Half Marathon",
      goal: "Fitness check — no taper, run ~8:00–8:20/mi easy",
    },
    {
      week: 14,
      date: "~Jun 21",
      name: "Half Marathon",
      goal: "Target: 1:33–1:38",
    },
    {
      week: 23,
      date: "~Aug 23",
      name: "10K or Half Marathon",
      goal: "Target: sub-46:00 (10K) / sub-1:30 (half)",
    },
  ],

  /**
   * Pace zones displayed on the Marathon page Pace Zones card.
   * accent: true visually highlights the goal marathon pace zone.
   */
  paceZones: [
    { label: "Easy / recovery",       pace: "9:00–9:30/mi", accent: false },
    { label: "General aerobic",       pace: "8:20–8:45/mi", accent: false },
    { label: "Early MP (wks 7–17)",   pace: "8:00–8:10/mi", accent: false },
    { label: "Tempo / threshold",     pace: "7:15–7:45/mi", accent: false },
    { label: "Goal marathon pace",    pace: "6:52/mi",      accent: true  },
    { label: "Yasso 800s",           pace: "6:40–6:50/mi", accent: false },
  ],
} as const;

// ── Health Targets ────────────────────────────────────────────────────────────
// Affects: app/(dashboard)/home/page.tsx (step bar),
//          app/(dashboard)/diet/page.tsx (macro & micronutrient cards),
//          app/(dashboard)/sleep/page.tsx (color thresholds),
//          lib/utils.ts (hrvColor helper).

export const health = {
  /**
   * Daily step target — the home page step bars fill to 100% at this value.
   * Also shown in the caption below the chart.
   */
  dailyStepGoal: 12000,

  /** Daily protein target in grams — shown in the diet page stat card. */
  proteinTargetG: 160,

  /** Daily hydration target in oz — shown in the diet page stat card. */
  hydrationTargetOz: 80,

  /**
   * Default daily calorie target — used when Cronometer hasn't set a
   * calorie_target on the nutrition_daily row for today.
   */
  calorieTarget: 2800,

  /**
   * Micronutrient reference daily intake targets for the diet page progress bars.
   * Units: mg except vitamin_d_iu (IU).
   */
  micronutrientTargets: {
    iron_mg:       18,
    sodium_mg:     2300,
    potassium_mg:  4700,
    magnesium_mg:  420,
    vitamin_d_iu:  600,
    calcium_mg:    1000,
  },

  /**
   * Sleep duration thresholds for traffic-light coloring on the sleep page.
   * All values in hours.
   * >= positiveHours → text-positive (deep brown)
   * >= warningHours  → text-warning  (amber)
   * <  warningHours  → text-negative (caramel)
   */
  sleepThresholds: {
    positiveHours: 7,
    warningHours:  6,
  },

  /**
   * HRV thresholds used by lib/utils.ts hrvColor() for coloring HRV stats.
   * Values in milliseconds.
   * >= positive → text-positive
   * >= warning  → text-warning
   * <  warning  → text-negative
   */
  hrvThresholds: {
    positive: 55,
    warning:  40,
  },
} as const;

// ── Feature flags ─────────────────────────────────────────────────────────────
// Toggle optional modules on/off. The page files stay in the repo so forkers
// can enable them — they just won't appear in the nav when set to false.

export const features = {
  /**
   * Diet / nutrition tracking (Cronometer sync, macro & micronutrient pages).
   * Requires CRONOMETER_USER + CRONOMETER_PASS in .env.local.
   * Set to true to show the Diet link in the sidebar.
   */
  diet: false,
} as const;

// ── Types (derived — do not edit) ─────────────────────────────────────────────

export type BrandingConfig  = typeof branding;
export type MarathonConfig  = typeof marathon;
export type HealthConfig    = typeof health;
export type FeaturesConfig  = typeof features;
