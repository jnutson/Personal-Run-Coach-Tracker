#!/usr/bin/env python3
"""
garmin_sync.py — Pulls data from Garmin Connect and pushes it to the Next.js API.

Retries up to 3 times on failure. Sends a Telegram alert if all retries fail.

Usage:
    python3 garmin_sync.py [--days 2]

Cron (Mac Mini):
    # Morning — backfill previous night's sleep (Garmin delays sleep data ~8h)
    0 9 * * * cd "/Users/jnutson/Desktop/Personal Tracker/scripts" && python3 garmin_sync.py --days 2 >> /tmp/garmin_sync_morning.log 2>&1
    # Evening — sync today's activity + metrics
    30 20 * * * cd "/Users/jnutson/Desktop/Personal Tracker/scripts" && python3 garmin_sync.py --days 2 >> /tmp/garmin_sync_evening.log 2>&1
"""

import os
import sys
import time
import argparse
import logging
from datetime import date, timedelta
from typing import Any

import requests
from dotenv import load_dotenv

try:
    from garminconnect import Garmin
except ImportError:
    print("Install garminconnect: pip install garminconnect")
    sys.exit(1)

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

GARMIN_EMAIL    = os.environ["GARMIN_EMAIL"]
GARMIN_PASSWORD = os.environ["GARMIN_PASSWORD"]
API_BASE        = os.environ["NEXT_PUBLIC_APP_URL"].rstrip("/")
SYNC_SECRET     = os.environ["SYNC_SECRET"]
BOT_TOKEN       = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID         = os.environ.get("TELEGRAM_CHAT_ID", "")

from config import MAX_RETRIES, RETRY_DELAY, GARMIN_SYNC_DAYS


# ── Telegram alert ────────────────────────────────────────────────────────────

def send_alert(message: str) -> None:
    if not BOT_TOKEN or not CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={"chat_id": CHAT_ID, "text": message, "parse_mode": "Markdown"},
            timeout=10,
        )
    except Exception:
        pass


# ── Retry helper ──────────────────────────────────────────────────────────────

def with_retry(fn, *args, label: str = "", **kwargs):
    last_exc = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            last_exc = e
            log.warning(f"{label} attempt {attempt}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY * attempt)
    raise last_exc


# ── Garmin helpers ────────────────────────────────────────────────────────────

def garmin_login() -> Garmin:
    # In CI (GitHub Actions), use a pre-generated OAuth token to avoid
    # Garmin's cloud-IP rate limit on username/password logins.
    oauth_token = os.environ.get("GARMIN_OAUTH_TOKEN")
    if oauth_token:
        import base64, json, pathlib, tempfile
        log.info("Restoring Garmin OAuth token from environment…")
        token_data = json.loads(base64.b64decode(oauth_token))
        token_dir = pathlib.Path(tempfile.mkdtemp())
        for name, content in token_data.items():
            (token_dir / name).write_text(content)
        import garth
        garth.load(str(token_dir))
        client = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
        client.garth = garth
        log.info("Token restored.")
        return client

    log.info("Logging in to Garmin Connect…")
    client = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
    client.login()
    log.info("Login successful.")
    return client


def date_range(days: int) -> list:
    today = date.today()
    return [today - timedelta(days=i) for i in range(days - 1, -1, -1)]


def safe_get(d: dict, *keys: str, default: Any = None) -> Any:
    for k in keys:
        if isinstance(d, dict):
            d = d.get(k, default)
        else:
            return default
    return d


def fetch_daily(client: Garmin, day: date) -> dict:
    ds = day.isoformat()
    row: dict[str, Any] = {"date": ds}

    try:
        stats = client.get_stats(ds)
        row["resting_hr"]         = safe_get(stats, "restingHeartRate")
        row["steps"]              = safe_get(stats, "totalSteps")
        row["training_load"]      = safe_get(stats, "trainingLoad")
        row["body_battery_start"] = safe_get(stats, "bodyBatteryHighestValue")
        row["body_battery_end"]   = safe_get(stats, "bodyBatteryLowestValue")
        # Wear hours: sum of daytime tracked seconds ÷ 3600
        active_sec         = safe_get(stats, "activeSeconds") or 0
        highly_active_sec  = safe_get(stats, "highlyActiveSeconds") or 0
        sedentary_sec      = safe_get(stats, "sedentarySeconds") or 0
        total_daytime_sec  = active_sec + highly_active_sec + sedentary_sec
        if total_daytime_sec > 0:
            row["wear_hours"] = round(total_daytime_sec / 3600, 1)
    except Exception as e:
        log.warning(f"{ds} stats error: {e}")

    try:
        hrv_data = client.get_hrv_data(ds)
        row["hrv"] = safe_get(hrv_data, "hrvSummary", "lastNightAvg")
    except Exception as e:
        log.warning(f"{ds} HRV error: {e}")

    try:
        sleep_data   = client.get_sleep_data(ds)
        summary      = safe_get(sleep_data, "dailySleepDTO", default={})
        duration_sec = safe_get(summary, "sleepTimeSeconds")
        row["sleep_duration"] = round(duration_sec / 3600, 2) if duration_sec else None
        row["sleep_score"]    = safe_get(summary, "sleepScores", "overall", "value")
    except Exception as e:
        log.warning(f"{ds} sleep error: {e}")

    try:
        metrics = client.get_max_metrics(ds)
        if metrics and len(metrics) > 0:
            row["vo2max"] = safe_get(metrics[0], "generic", "vo2MaxValue")
    except Exception as e:
        log.warning(f"{ds} max metrics error: {e}")

    return row


def fetch_activities(client: Garmin, start: date, end: date) -> list:
    log.info(f"Fetching activities {start} → {end}")
    rows = []
    try:
        raw = client.get_activities_by_date(start.isoformat(), end.isoformat())
        for a in raw:
            activity_type = (safe_get(a, "activityType", "typeKey") or "unknown").lower()
            dist_m        = safe_get(a, "distance")
            duration_s    = safe_get(a, "duration")
            avg_pace      = None
            if dist_m and duration_s and dist_m > 0:
                avg_pace = round(duration_s / (dist_m / 1000))
            rows.append({
                "garmin_id":       safe_get(a, "activityId"),
                "activity_date":   (safe_get(a, "startTimeLocal") or "")[:10],
                "activity_type":   activity_type,
                "name":            safe_get(a, "activityName"),
                "distance_km":     round(dist_m / 1000, 3) if dist_m else None,
                "duration_sec":    int(duration_s) if duration_s else None,
                "avg_hr":          safe_get(a, "averageHR"),
                "max_hr":          safe_get(a, "maxHR"),
                "avg_pace_sec_km": avg_pace,
                "elevation_m":     safe_get(a, "elevationGain"),
                "calories":        safe_get(a, "calories"),
            })
    except Exception as e:
        log.error(f"Activities fetch error: {e}")
    return rows


def push_to_api(daily: list, activities: list) -> None:
    url     = f"{API_BASE}/api/garmin/sync"
    headers = {"Authorization": f"Bearer {SYNC_SECRET}", "Content-Type": "application/json"}
    log.info(f"Pushing {len(daily)} daily rows + {len(activities)} activities")
    resp = requests.post(url, headers=headers, json={"daily": daily, "activities": activities}, timeout=30)
    resp.raise_for_status()
    log.info(f"API response: {resp.json()}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=GARMIN_SYNC_DAYS)
    args = parser.parse_args()

    try:
        client = with_retry(garmin_login, label="Garmin login")

        days = date_range(args.days)
        log.info(f"Syncing {args.days} days: {days[0]} → {days[-1]}")

        daily_rows = []
        for day in days:
            row = fetch_daily(client, day)
            daily_rows.append(row)
            log.info(f"  {day}: steps={row.get('steps')}, hrv={row.get('hrv')}, sleep={row.get('sleep_duration')}h")

        activity_rows = fetch_activities(client, days[0], days[-1])
        log.info(f"Fetched {len(activity_rows)} activities")

        with_retry(push_to_api, daily_rows, activity_rows, label="API push")
        log.info("Garmin sync complete ✓")

    except Exception as e:
        log.error(f"Garmin sync failed after {MAX_RETRIES} attempts: {e}")
        send_alert(
            f"⚠️ *Garmin sync failed*\n\n"
            f"All {MAX_RETRIES} retries exhausted.\n"
            f"`{e}`\n\n"
            f"Check `/tmp/garmin_sync_evening.log`"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
