# ─────────────────────────────────────────────────────────────────────────────
# config.py — Central configuration for all Personal Tracker sync scripts.
#
# To change sync behaviour, edit this file then re-run install_cron.sh.
# ─────────────────────────────────────────────────────────────────────────────

# ── Sync windows ──────────────────────────────────────────────────────────────
# How many days back each script pulls on every run.
GARMIN_SYNC_DAYS      = 2   # covers today + yesterday (sleep backfill)
CRONOMETER_SYNC_DAYS  = 2

# ── Retry behaviour ───────────────────────────────────────────────────────────
# Scripts retry this many times before giving up and sending a Telegram alert.
MAX_RETRIES  = 3
RETRY_DELAY  = 30   # base seconds; multiplied by attempt number (30s, 60s, 90s)

# ── Schedule (for reference — edit install_cron.sh to change times) ───────────
# 07:30 PM PST  garmin_sync.py (evening)
# 07:35 PM PST  cronometer_sync.py
# 07:45 PM PST  telegram_checkin_cron.py  (survey + food reminder + adjust-plan agent)
# 09:00 AM PST  garmin_sync.py (morning — backfills previous night's sleep)
