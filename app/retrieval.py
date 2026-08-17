import os
import re
import sqlite3
from datetime import date
from dotenv import load_dotenv
import time

import requests
from requests.exceptions import ReadTimeout, ConnectionError

from app.database import get_connection

# Crops we know how to detect in a message. Extend this list as needed —
# it drives both the Agmarknet query and the keyword match.
KNOWN_CROPS = [
    "tomato", "onion", "wheat", "cotton", "soybean", "rice",
    "potato", "chilli", "orange", "gram", "tur", "jowar",
    "ladyfinger", "okra", "bhindi", "brinjal", "eggplant",
    "cabbage", "cauliflower", "cucumber", "garlic", "ginger",
    "maize", "corn", "groundnut", "sugarcane", "moong", "bajra",
]

AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
AGMARKNET_URL = f"https://api.data.gov.in/resource/{AGMARKNET_RESOURCE_ID}"

# Fixed since this deployment is Nagpur-only — no need to detect location.
STATE = "Maharashtra"
DISTRICT = "Nagpur"


def _detect_crop(user_message: str) -> str | None:
    message_lower = user_message.lower()
    for crop in KNOWN_CROPS:
        if re.search(rf"\b{re.escape(crop)}\b", message_lower):
            return crop
    return None


def _get_cached_price(conn: sqlite3.Connection, crop: str) -> str | None:
    row = conn.execute(
        "SELECT content FROM price_cache WHERE crop = ? AND date = ?",
        (crop, str(date.today())),
    ).fetchone()
    return row["content"] if row else None


def _save_cache(conn: sqlite3.Connection, crop: str, content: str) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO price_cache (crop, date, content) VALUES (?, ?, ?)",
        (crop, str(date.today()), content),
    )
    conn.commit()


def _fetch_live_price(crop: str, max_retries: int = 3) -> str | None:
    """Calls the Agmarknet API (data.gov.in) for today's Nagpur price of a crop with retry logic."""
    api_key = os.getenv("AGMARKNET_API_KEY")
    if not api_key:
        print(f"[retrieval] No AGMARKNET_API_KEY set — skipping live fetch for '{crop}'")
        return None

    for attempt in range(max_retries):
        try:
            response = requests.get(
                AGMARKNET_URL,
                params={
                    "api-key": api_key,
                    "format": "json",
                    "filters[state]": STATE,
                    "filters[district]": DISTRICT,
                    "filters[commodity]": crop.title(),
                    "limit": 5,
                },
                timeout=5,
            )
            print(f"[retrieval] Agmarknet request for '{crop}' attempt {attempt+1} -> status {response.status_code}")
            response.raise_for_status()
            records = response.json().get("records", [])
            print(f"[retrieval] Agmarknet returned {len(records)} record(s) for '{crop}'")
            return _format_price_response(crop, records)
        except (ReadTimeout, ConnectionError) as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 1s, 2s
                print(f"[retrieval] Agmarknet timeout on attempt {attempt+1}, retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
            else:
                print(f"[retrieval] Agmarknet FAILED after {max_retries} attempts for '{crop}': {e}")
        except ValueError as e:
            print(f"[retrieval] Agmarknet response wasn't valid JSON for '{crop}': {e}")
            return None
        except requests.RequestException as e:
            print(f"[retrieval] Agmarknet request FAILED for '{crop}': {e}")
            return None

    return None


def _format_price_response(crop: str, records: list) -> str | None:
    """Format the API response into a readable price string."""
    if not records:
        return None

    lines = []
    for rec in records[:3]:
        market = rec.get("market", DISTRICT)
        modal_price = rec.get("modal_price")
        arrival_date = rec.get("arrival_date")
        if modal_price:
            lines.append(f"{crop.title()} in {market}: ₹{modal_price}/quintal (as of {arrival_date})")

    return "\n".join(lines) if lines else None



def _fetch_fallback_price(conn: sqlite3.Connection, crop: str) -> str | None:
    """Falls back to the local sample table if the live API is unavailable."""
    rows = conn.execute(
        "SELECT market, price_per_quintal, date FROM mandi_prices "
        "WHERE crop = ? ORDER BY date DESC LIMIT 3",
        (crop,),
    ).fetchall()
    if not rows:
        return None
    return "\n".join(
        f"{crop.title()} in {row['market']}: ₹{row['price_per_quintal']}/quintal (as of {row['date']}) [sample data]"
        for row in rows
    )


def get_market_context(user_message: str) -> str | None:
    """
    Detects a crop mention, then returns today's Nagpur mandi price for it —
    live from Agmarknet if a key is configured, cached if already fetched
    today, or sample data as a last-resort fallback.
    """
    crop = _detect_crop(user_message)
    if not crop:
        return None

    conn = get_connection()

    cached = _get_cached_price(conn, crop)
    if cached:
        conn.close()
        return cached

    live = _fetch_live_price(crop)
    if live:
        _save_cache(conn, crop, live)
        conn.close()
        return live

    fallback = _fetch_fallback_price(conn, crop)
    conn.close()
    return fallback