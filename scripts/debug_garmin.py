#!/usr/bin/env python3
import json
from datetime import date
from dotenv import load_dotenv
import os
from garminconnect import Garmin

load_dotenv()

client = Garmin(os.environ["GARMIN_EMAIL"], os.environ["GARMIN_PASSWORD"])
client.login()

ds = date.today().isoformat()

print("=== HRV DATA ===")
try:
    print(json.dumps(client.get_hrv_data(ds), indent=2))
except Exception as e:
    print(f"Error: {e}")

print("\n=== TRAINING STATUS ===")
try:
    print(json.dumps(client.get_training_status(ds), indent=2))
except Exception as e:
    print(f"Error: {e}")

print("\n=== MAX METRICS ===")
try:
    print(json.dumps(client.get_max_metrics(ds), indent=2))
except Exception as e:
    print(f"Error: {e}")

print("\n=== STATS AND BODY ===")
try:
    print(json.dumps(client.get_stats_and_body(ds), indent=2))
except Exception as e:
    print(f"Error: {e}")

print("\n=== TRAINING READINESS ===")
try:
    print(json.dumps(client.get_training_readiness(ds), indent=2))
except Exception as e:
    print(f"Error: {e}")
