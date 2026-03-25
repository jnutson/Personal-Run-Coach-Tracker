#!/usr/bin/env python3
"""
telegram_checkin_cron.py — Evening automation runner (8:30 PM PT).

What it does:
  1. Checks if today's nutrition has been logged in Cronometer.
     If not → sends a food log reminder via Telegram.
  2. Kicks off the /survey (daily check-in) conversation.

Cron (Mac):
    Add to crontab with: crontab -e
    TZ=America/Los_Angeles
    30 20 * * * cd /Users/jnutson/Desktop/Personal\ Tracker/scripts && python3 telegram_checkin_cron.py >> /tmp/telegram_cron.log 2>&1
"""

import os
import time
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

BOT_TOKEN   = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID     = os.environ["TELEGRAM_CHAT_ID"]
API_BASE    = os.environ.get("NEXT_PUBLIC_APP_URL", "").rstrip("/")
SYNC_SECRET = os.environ.get("SYNC_SECRET", "")

TG_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"


def send_message(text: str) -> None:
    resp = requests.post(TG_URL, json={"chat_id": CHAT_ID, "text": text, "parse_mode": "Markdown"}, timeout=10)
    log.info(f"sendMessage: {resp.status_code}")


def nutrition_logged_today() -> bool:
    """Returns True if today's nutrition has already been logged."""
    if not API_BASE or not SYNC_SECRET:
        log.warning("API_BASE or SYNC_SECRET not set — skipping nutrition check")
        return True  # assume logged so we don't spam

    try:
        resp = requests.get(
            f"{API_BASE}/api/nutrition/status",
            headers={"Authorization": f"Bearer {SYNC_SECRET}"},
            timeout=25,  # allow for Vercel cold start
        )
        if resp.ok:
            data = resp.json()
            logged = data.get("logged", False)
            log.info(f"Nutrition logged today: {logged}")
            return logged
        else:
            log.warning(f"Nutrition status check failed: {resp.status_code}")
            return True
    except Exception as e:
        log.warning(f"Could not check nutrition status: {e}")
        return True


def trigger_survey() -> None:
    """Simulates the user sending /survey to start the check-in conversation."""
    if not API_BASE:
        log.warning("API_BASE not set — cannot trigger survey via webhook")
        return

    payload = {
        "message": {
            "chat": {"id": int(CHAT_ID)},
            "from": {"id": int(CHAT_ID)},
            "text": "/survey",
            "date": int(time.time()),
            "message_id": 1,
        }
    }
    try:
        resp = requests.post(f"{API_BASE}/api/telegram/webhook", json=payload, timeout=25)
        log.info(f"Survey triggered via webhook: {resp.status_code}")
    except Exception as e:
        log.warning(f"Webhook trigger failed, sending prompt directly: {e}")
        send_message(
            "👋 *Evening check-in!*\n\nDid you exercise today? (y/n)\n\n"
            "_Reply to start — or send /survey_"
        )


def trigger_agent(path: str, label: str, timeout: int = 60) -> None:
    """Calls an agent endpoint. path is relative to API_BASE."""
    if not API_BASE or not SYNC_SECRET:
        log.warning(f"API_BASE or SYNC_SECRET not set — skipping {label}")
        return
    try:
        resp = requests.post(
            f"{API_BASE}{path}",
            headers={"Authorization": f"Bearer {SYNC_SECRET}"},
            timeout=timeout,
        )
        log.info(f"{label}: {resp.status_code}")
    except Exception as e:
        log.warning(f"{label} failed: {e}")


def main():
    log.info("=== Evening automation starting ===")

    # 1. Food log reminder if not logged
    if not nutrition_logged_today():
        log.info("Nutrition not logged — sending reminder")
        send_message(
            "🍽 *Food not logged yet today!*\n\n"
            "Don't forget to log your meals from Cronometer.\n"
            "Send /foodlog to log manually."
        )
        time.sleep(2)

    # 2. Start the nightly survey
    log.info("Triggering nightly survey…")
    trigger_survey()
    time.sleep(2)

    # 3. Reconcile this week's activities against the plan
    log.info("Triggering reconcile-week agent…")
    trigger_agent("/api/agent/reconcile-week", "Reconcile-week agent", timeout=60)
    time.sleep(2)

    # 4. Run the adjust-plan agent (forward-looking)
    log.info("Triggering adjust-plan agent…")
    trigger_agent("/api/agent/adjust-plan", "Adjust-plan agent", timeout=60)

    log.info("=== Done ===")


if __name__ == "__main__":
    main()
