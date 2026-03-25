#!/usr/bin/env python3
"""
cronometer_import.py — Import a Cronometer CSV export into the app.

Usage:
    1. In Cronometer: Account → Export Data → Daily Summary → download CSV
    2. python3 cronometer_import.py path/to/cronometer_export.csv

Or pipe a specific date range:
    python3 cronometer_import.py export.csv --days 7
"""

import os
import sys
import csv
import logging
import argparse
from datetime import date, timedelta
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

API_BASE    = os.environ["NEXT_PUBLIC_APP_URL"].rstrip("/")
SYNC_SECRET = os.environ["SYNC_SECRET"]


def safe_float(v: str) -> Optional[float]:
    try:
        return float(v) if v and v.strip() else None
    except (ValueError, TypeError):
        return None


def parse_csv(filepath: str, since: Optional[date] = None) -> list:
    rows = []
    with open(filepath, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            day_str = row.get("Date", "").strip()
            if not day_str:
                continue
            if since:
                try:
                    row_date = date.fromisoformat(day_str)
                    if row_date < since:
                        continue
                except ValueError:
                    pass
            rows.append({
                "date":         day_str,
                "calories":     safe_float(row.get("Energy (kcal)")),
                "protein_g":    safe_float(row.get("Protein (g)")),
                "carbs_g":      safe_float(row.get("Carbs (g)")),
                "fat_g":        safe_float(row.get("Fat (g)")),
                "iron_mg":      safe_float(row.get("Iron (mg)")),
                "sodium_mg":    safe_float(row.get("Sodium (mg)")),
                "potassium_mg": safe_float(row.get("Potassium (mg)")),
                "magnesium_mg": safe_float(row.get("Magnesium (mg)")),
                "vitamin_d_iu": safe_float(row.get("Vitamin D (IU)")),
                "calcium_mg":   safe_float(row.get("Calcium (mg)")),
            })
    return rows


def push_to_api(nutrition: list) -> None:
    url = f"{API_BASE}/api/cronometer/sync"
    headers = {
        "Authorization": f"Bearer {SYNC_SECRET}",
        "Content-Type": "application/json",
    }
    log.info(f"Pushing {len(nutrition)} rows to {url}")
    resp = requests.post(url, headers=headers, json={"nutrition": nutrition}, timeout=30)
    if resp.ok:
        log.info(f"Done: {resp.json()}")
    else:
        log.error(f"API error {resp.status_code}: {resp.text}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv", help="Path to Cronometer daily summary CSV export")
    parser.add_argument("--days", type=int, default=None,
                        help="Only import the last N days (default: all rows in file)")
    args = parser.parse_args()

    since = date.today() - timedelta(days=args.days) if args.days else None
    rows = parse_csv(args.csv, since=since)

    if not rows:
        log.warning("No rows found in CSV (check date range or file format)")
        sys.exit(0)

    log.info(f"Parsed {len(rows)} days from {args.csv}")
    push_to_api(rows)


if __name__ == "__main__":
    main()
