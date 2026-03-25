# Claude Code Prompt — Marathon Training Dashboard

Paste this entire prompt into Claude Code to build the dashboard page.

---

## Prompt

Build a marathon training dashboard page based on the plan in `chicago-marathon-plan.md`. This is a personal training tracker for a runner targeting 3:00:00 at the Chicago Marathon on October 12, 2026.

### Stack
Detect what framework this repo uses and match it exactly. If React/Next.js, create a new page at `app/marathon/page.tsx` (or `pages/marathon.tsx`). If plain HTML, create `marathon.html`. Use the existing design system, component library, and styling conventions already present in the repo.

### Design direction
Athletic, data-forward, dark-first. Think sports analytics dashboard — Whoop, Strava, or Nike Run Club aesthetic. Monospaced type for numbers and paces. High contrast. Tight grid. No decorative fluff — every element earns its space.

Specific aesthetic requirements:
- Dark background (`#0a0a0a` or near-black) with off-white text
- Accent color: electric blue (`#2563EB` or similar) for progress, current week, and CTAs
- Amber/gold (`#F59E0B`) for warning states (injury watch weeks, down weeks)
- Green (`#10B981`) for completed weeks and race day
- Monospaced font (JetBrains Mono, IBM Plex Mono, or Fira Code) for all pace and mileage numbers
- Clean sans-serif (Geist, DM Sans, or system stack) for labels and prose

### Page sections to build

#### 1. Header / hero
- Race name: "Chicago Marathon 2026"
- Countdown: days remaining to October 12, 2026 (computed dynamically from today's date)
- Two key stats side by side: Current PR (4:01:00) → Goal (3:00:00)
- Current week number and phase name

#### 2. Fitness snapshot (from Strava data)
Four metric cards in a row:
- Easy pace: 9:08/mi
- Moderate pace: 8:01/mi  
- Avg weekly mileage: 19.9mi
- Training peak: 33.3mi (Jan '26)

#### 3. Mileage chart
Bar chart showing all 30 plan weeks as bars, colored by phase:
- Recovery: gray
- Base: blue
- Threshold: purple
- Race-specific: orange/coral
- Taper: green
- Current week: brighter/highlighted

Show a horizontal "current week" indicator line. Use Recharts if React, Chart.js if plain JS.

Week data array (use exactly these values):
```js
const planWeeks = [
  { wk: 1,  date: 'Mar 16', phase: 'Recovery',   mi: 18, down: false },
  { wk: 2,  date: 'Mar 23', phase: 'Recovery',   mi: 20, down: false },
  { wk: 3,  date: 'Mar 30', phase: 'Base',        mi: 25, down: false },
  { wk: 4,  date: 'Apr 06', phase: 'Base',        mi: 27, down: false },
  { wk: 5,  date: 'Apr 13', phase: 'Base',        mi: 22, down: true  },
  { wk: 6,  date: 'Apr 20', phase: 'Base',        mi: 29, down: false },
  { wk: 7,  date: 'Apr 27', phase: 'Base',        mi: 31, down: false },
  { wk: 8,  date: 'May 04', phase: 'Base',        mi: 25, down: true  },
  { wk: 9,  date: 'May 11', phase: 'Base',        mi: 34, down: false },
  { wk: 10, date: 'May 18', phase: 'Base',        mi: 37, down: false },
  { wk: 11, date: 'May 25', phase: 'Base',        mi: 30, down: true  },
  { wk: 12, date: 'Jun 01', phase: 'Threshold',   mi: 40, down: false },
  { wk: 13, date: 'Jun 08', phase: 'Threshold',   mi: 43, down: false },
  { wk: 14, date: 'Jun 15', phase: 'Threshold',   mi: 35, down: true, tuneUp: 'Half marathon — target 1:35–1:38' },
  { wk: 15, date: 'Jun 22', phase: 'Threshold',   mi: 46, down: false },
  { wk: 16, date: 'Jun 29', phase: 'Threshold',   mi: 50, down: false },
  { wk: 17, date: 'Jul 06', phase: 'Threshold',   mi: 41, down: true  },
  { wk: 18, date: 'Jul 13', phase: 'Race-Spec',   mi: 52, down: false },
  { wk: 19, date: 'Jul 20', phase: 'Race-Spec',   mi: 54, down: false },
  { wk: 20, date: 'Jul 27', phase: 'Race-Spec',   mi: 44, down: true  },
  { wk: 21, date: 'Aug 03', phase: 'Race-Spec',   mi: 55, down: false },
  { wk: 22, date: 'Aug 10', phase: 'Race-Spec',   mi: 56, down: false },
  { wk: 23, date: 'Aug 17', phase: 'Race-Spec',   mi: 45, down: true, tuneUp: '10K sub-46 or half sub-1:30' },
  { wk: 24, date: 'Aug 24', phase: 'Race-Spec',   mi: 55, down: false },
  { wk: 25, date: 'Aug 31', phase: 'Taper',       mi: 42, down: false },
  { wk: 26, date: 'Sep 07', phase: 'Taper',       mi: 32, down: false },
  { wk: 27, date: 'Sep 14', phase: 'Taper',       mi: 22, down: false },
  { wk: 28, date: 'Sep 21', phase: 'Taper',       mi: 16, down: false },
  { wk: 29, date: 'Sep 28', phase: 'Taper',       mi: 10, down: false },
  { wk: 30, date: 'Oct 05', phase: 'Race',        mi: 0,  down: false },
];
```

#### 4. Current week card (prominent)
Show the current week (compute from today vs Mar 16 start date) as a highlighted card:
- Week number and date range
- Phase badge
- Mileage target
- Key session title
- Day-by-day breakdown (Mon–Sun) with session type

Key sessions per week (hardcode these for the first 8 weeks, then follow the pattern from the plan):
```js
const keySession = {
  1: { title: 'Easy only ×4', detail: 'HR <150 every run. Zero quality.' },
  2: { title: 'Easy + strides', detail: '4–5×20sec strides Saturday only.' },
  3: { title: 'Long run 10mi', detail: 'Easy 9:00–9:30/mi. Strides 2×/wk.' },
  4: { title: 'Long run 12mi', detail: '8% build. Keep 80% easy.' },
  5: { title: 'Down week', detail: 'Long run 8mi. All runs reduced 20%.' },
  6: { title: 'Long run 13mi', detail: 'Strides 2×/wk. Rebuilding.' },
  7: { title: 'Long 14mi + MP miles', detail: 'Last 3mi @ 8:00–8:10/mi.' },
  8: { title: 'Down week', detail: 'Long 10mi easy. No quality.' },
};
```

#### 5. Pace zones reference
Two-column grid of pace zone cards:
- Easy / recovery: 9:00–9:30/mi
- General aerobic: 8:20–8:45/mi
- Early MP targets (wks 7–17): 8:00–8:10/mi
- Tempo / threshold: 7:15–7:45/mi
- Goal marathon pace: 6:52/mi (highlight this one — blue accent border)
- Yasso 800s: 6:40–6:50/mi

#### 6. Tune-up races
Two cards side by side:
- Race 1: Half marathon, Week 14 (~Jun 22), target 1:35–1:38
- Race 2: 10K or Half, Week 23 (~Aug 17), target sub-46:00 / sub-1:30

#### 7. Full plan table
Scrollable table with all 30 weeks. Columns: Week, Date, Miles, Phase, Key Session, Notes.
- Highlight current week row
- Amber background on down weeks
- Green border on tune-up race weeks
- Show injury watch icon (⚠) on weeks 7–10, 12–16, 18–22

#### 8. Injury prevention panel (collapsible)
Collapsible section with three tabs: Daily, Post-run, Weekly strength.
Content from the "Injury Prevention Protocols" section of the plan.

### State management
- Compute current week automatically: `Math.floor((today - new Date('2026-03-16')) / (7 * 24 * 60 * 60 * 1000)) + 1`
- If current week < 1 (before Mar 16): show "Training starts in N days"
- If current week > 30: show "Race complete"
- Store completed week check-offs in localStorage under key `marathon_completed_weeks`

### Navigation
Add a link to this page in the existing nav if one exists. If no nav exists, add a simple back link.

### Files to create
- The main page component/file
- A `data/marathon-plan.ts` (or `.js`) file that exports the `planWeeks` array and `keySession` map so they're not hardcoded in the component
- Do NOT create separate CSS files — use whatever styling approach the repo already uses (Tailwind, CSS modules, styled-components, etc.)

### Do not
- Add new dependencies without checking if an equivalent already exists in package.json
- Use placeholder lorem ipsum text — all content is real and provided above
- Invent data — use only the values explicitly provided in this prompt

Reference file: `chicago-marathon-plan.md` (in repo root) for full week-by-week notes and injury protocols.
