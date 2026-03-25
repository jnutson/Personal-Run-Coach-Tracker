# Personal Tracker — Josh Nutson's Wellness OS

A fullstack personal dashboard for training, sleep, diet, and daily habits.
Dark theme · Garmin Connect · Cronometer · Telegram bot · Claude AI weekly summaries.

---

## Stack

| Layer      | Tech                                    |
|------------|-----------------------------------------|
| Frontend   | Next.js 14 (App Router) + TypeScript    |
| Styling    | Tailwind CSS + custom shadcn components |
| Charts     | Recharts                                |
| Database   | Supabase (Postgres + Auth)              |
| Hosting    | Vercel (frontend) + Supabase (DB)       |
| Sync       | Python scripts (garminconnect library)  |
| Bot        | Telegram Bot API                        |
| AI         | Anthropic Claude (claude-sonnet-4)      |

---

## Setup

### 1. Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. In **SQL Editor**, run `supabase/migrations/001_initial_schema.sql`
3. Run `supabase/migrations/002_marathon_plan.sql` (populates the 18-week plan)
4. In **Settings → API**, copy your URL, anon key, and service role key

### 2. Environment variables

```bash
cp .env.example .env.local
# Fill in all values
```

Key variables:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `GARMIN_EMAIL` / `GARMIN_PASSWORD` | Your Garmin Connect credentials |
| `CRONOMETER_USER` / `CRONOMETER_PASS` | Your Cronometer Gold credentials |
| `TELEGRAM_BOT_TOKEN` | See below |
| `TELEGRAM_CHAT_ID` | See below |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `SYNC_SECRET` | Run `openssl rand -hex 32` |

### 3. Create the Telegram bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` → follow prompts → choose name and username (e.g. `JoshTrackerBot`)
3. Copy the **token** → set as `TELEGRAM_BOT_TOKEN`
4. Find your **chat ID**:
   - Start a conversation with your bot (send it `/start`)
   - Visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Find `"chat": {"id": 123456789}` → that's your `TELEGRAM_CHAT_ID`
5. After deploying to Vercel, set the webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.vercel.app/api/telegram/webhook"
```

### 4. Install and run locally

```bash
npm install
npm run dev
# Visit http://localhost:3000
```

### 5. Python sync scripts

```bash
cd scripts
pip install -r requirements.txt

# Test Garmin sync (last 7 days)
python3 garmin_sync.py --days 7

# Test Cronometer sync
python3 cronometer_sync.py --days 7
```

The scripts need the env vars too — they read `.env` from the current directory:

```bash
# Copy the same vars into scripts/.env
cp ../.env.local .env
```

### 6. Set up daily cron (Mac)

Add to your crontab (`crontab -e`):

```cron
# Garmin sync — 6 AM PT daily
0 6 * * * cd /path/to/Personal\ Tracker/scripts && python garmin_sync.py >> /tmp/garmin_sync.log 2>&1

# Cronometer sync — 6:30 AM PT daily
30 6 * * * cd /path/to/Personal\ Tracker/scripts && python cronometer_sync.py >> /tmp/cronometer_sync.log 2>&1

# Telegram check-in prompt — 8:30 PM PT daily
30 20 * * * cd /path/to/Personal\ Tracker/scripts && TZ=America/Los_Angeles python telegram_checkin_cron.py >> /tmp/checkin_cron.log 2>&1
```

### 7. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

In Vercel dashboard → **Settings → Environment Variables**, add all vars from `.env.example`.

Vercel Cron jobs (defined in `vercel.json`) run:
- Garmin sync route: 6 AM UTC daily
- Cronometer sync route: 7 AM UTC daily
- Weekly AI summary: 3 AM UTC Monday (Sunday 8 PM PT)

> **Note**: Vercel Cron calls the API route, but the Garmin/Cronometer routes need the Python scripts to push data. Use the Mac cron for the actual data sync — the Vercel cron is a fallback trigger.

---

## Architecture

```
Personal Tracker/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar layout
│   │   ├── training/           # Training dashboard + charts + plan table
│   │   ├── sleep/              # Sleep & health dashboard + charts
│   │   ├── diet/               # Diet dashboard + charts + manual entry
│   │   └── goals/              # Goals, habit heatmap, journal, AI summaries
│   ├── api/
│   │   ├── garmin/sync/        # Receives Garmin data from Python script
│   │   ├── cronometer/sync/    # Receives Cronometer data from Python script
│   │   ├── nutrition/manual/   # Manual nutrition entry
│   │   ├── training-plan/update/ # Edit training plan
│   │   ├── telegram/webhook/   # Telegram bot conversation handler
│   │   └── weekly-summary/     # Claude AI weekly summary generator
│   ├── layout.tsx
│   └── page.tsx                # Redirects → /training
├── components/
│   ├── sidebar.tsx
│   ├── stat-card.tsx
│   ├── section-header.tsx
│   ├── empty-state.tsx
│   └── ui/                     # card, badge, button, input
├── lib/
│   ├── supabase.ts             # Browser + service client
│   ├── types.ts                # All DB types
│   └── utils.ts                # Formatting helpers
├── scripts/
│   ├── garmin_sync.py          # Garmin Connect → API
│   ├── cronometer_sync.py      # Cronometer → API
│   ├── telegram_checkin_cron.py # Triggers evening check-in
│   └── requirements.txt
├── supabase/migrations/
│   ├── 001_initial_schema.sql  # All tables + RLS + indexes
│   └── 002_marathon_plan.sql   # 18-week marathon training plan
├── vercel.json                 # Cron schedule
└── .env.example
```

---

## Daily Check-in Flow (Telegram)

Each evening at 8:30 PM PT, the cron script triggers the check-in:

1. Did you exercise today? (y/n)
2. Did you meditate today? (y/n)
3. Did you stretch today? (y/n)
4. Energy today? (1-10)
5. Mood today? (1-10)
6. Mental health today? (1-10)
7. How many oz of water today?
8. Anything to journal? (or 'skip')

→ Saves to `daily_checkin` table → bot sends friendly summary

---

## Weekly AI Summary

Every Sunday 8 PM PT, Claude generates a 200-300 word summary:
- Past 7 days across all 4 categories
- Wins + concerns (overtraining risk, sleep, nutrition)
- 2-3 actionable suggestions for next week

Delivered via Telegram AND displayed in the Goals dashboard.

---

## Marathon Plan

18-week plan targeting **October 25, 2026** (adjust in `002_marathon_plan.sql`).
Week 1 starts June 29, 2026.
- Weeks 1-5: Base building
- Weeks 6-13: Build phase with tempo + intervals
- Weeks 14-15: Peak weeks (32km long run)
- Weeks 16-17: Taper
- Week 18: Race week

Edit any workout in the Training dashboard → Upcoming Plan table.
