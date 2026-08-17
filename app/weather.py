import os
import re
import time
from dotenv import load_dotenv

import requests

load_dotenv()

# Fixed since this deployment is Nagpur-only.
NAGPUR_LAT = 21.1458
NAGPUR_LON = 79.0882

WEATHER_KEYWORDS = [
    "weather", "rain", "raining", "temperature", "forecast",
    "mausam", "barish", "humidity", "hot", "cold", "sunny",
]

CACHE_SECONDS = 30 * 60  # 30 minutes — weather doesn't change fast enough to fetch every message
_cache: dict = {"content": None, "fetched_at": 0}


def _mentions_weather(user_message: str) -> bool:
    message_lower = user_message.lower()
    return any(re.search(rf"\b{kw}\b", message_lower) for kw in WEATHER_KEYWORDS)


def _fetch_live_weather() -> str | None:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        print("[weather] No OPENWEATHER_API_KEY set — skipping live fetch")
        return None

    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "lat": NAGPUR_LAT,
                "lon": NAGPUR_LON,
                "appid": api_key,
                "units": "metric",
            },
            timeout=10,
        )
        print(f"[weather] OpenWeatherMap request -> status {response.status_code}")
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        print(f"[weather] OpenWeatherMap request FAILED: {e}")
        return None
    except ValueError as e:
        print(f"[weather] OpenWeatherMap response wasn't valid JSON: {e}")
        return None

    try:
        description = data["weather"][0]["description"]
        temp = data["main"]["temp"]
        humidity = data["main"]["humidity"]
        rain = data.get("rain", {}).get("1h")
    except (KeyError, IndexError) as e:
        print(f"[weather] Unexpected response shape, missing key: {e}")
        return None

    content = f"Nagpur weather right now: {description}, {temp}°C, {humidity}% humidity"
    if rain:
        content += f", {rain}mm rain in the last hour"
    return content


def get_weather_context(user_message: str) -> str | None:
    """
    Returns current Nagpur weather if the message mentions weather, using a
    30-minute in-memory cache so we're not calling the API on every message.
    """
    if not _mentions_weather(user_message):
        return None

    now = time.time()
    if _cache["content"] and (now - _cache["fetched_at"] < CACHE_SECONDS):
        return _cache["content"]

    live = _fetch_live_weather()
    if live:
        _cache["content"] = live
        _cache["fetched_at"] = now
    return live