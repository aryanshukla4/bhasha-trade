"""Voice command intent parser: takes a transcript and returns a structured
action the frontend can execute (navigate, prefill, speak, etc.).

Uses Groq LLM for intent classification — same API key as chat_ai.py.
Falls back to a simple keyword matcher when no API key is configured.
"""
import json
import re

import requests

from app.core.config import settings

INTENT_PROMPT = """You are the voice command parser for Bhasha Trade, a vernacular-first agri-marketplace website.

Given a user's spoken transcript (which may be in Hindi, Marathi, Tamil, Telugu, or English), return a JSON object.

{
  "intent": "<intent>",
  "entities": {},
  "route": "<frontend route>",
  "routeParams": {},
  "response": "<short confirmation in the SAME language as user input>",
  "prefill": {}
}

Intents (pick the BEST match):

1. "create_listing" — user wants to SELL/CREATE/BECH their crop
   route: /produce, prefill: {cropType, quantity, unit, pricePerUnit, state, district}
   Fill ALL fields the user mentions. If user says "5 kg gheu bechna hai 2000 rupaye mein UP se"
   → prefill: {cropType: "Wheat", quantity: 5, unit: "kg", pricePerUnit: 2000, state: "Uttar Pradesh"}
   Triggers: "bechna hai", "bechunga", "sell", "list my", "बेचना", "विक्री"

2. "search_produce" — user wants to SEE/FIND/BUY sellers or produce listings
   route: /produce, routeParams: {cropType: "English crop name"}
   Triggers: "दिखाओ", "dikhao", "sellers", "buyers", "कहाँ मिलेगा", "खरीद", "buy", "find"

3. "search_market" — user wants PRICES/मंडी/भाव of a crop
   route: /market, routeParams: {commodity: "English", state: "Full State Name"}
   Triggers: "price", "भाव", "दाम", "कितना", "मंडी", "rate", "market"

4. "check_orders" — view orders
   route: /orders

5. "barter" — exchange/swap one item for another
   route: /barter, prefill: {itemWanted, itemOffered, qtyWanted, qtyOffered, text}

6. "crop_doctor" — detect disease, check leaf
   route: /crop

7. "ask_assistant" — ask a farming question
   route: /chat, prefill: {question: "original text"}

8. "schemes" — government schemes
   route: /schemes

CRITICAL RULES:
- cropType and commodity MUST be in English. ALWAYS translate:
  गेहूं/gehu→Wheat, चावल/chawal→Rice, प्याज→Onion, टमाटर→Tomato, आलू→Potato,
  कपास→Cotton, गन्ना→Sugarcane, सोयाबीन→Soybean, मक्का→Maize, मिर्च→Chilli,
  लहसुन→Garlic, अदरक→Ginger, हल्दी→Turmeric, सरसों→Mustard, चना→Chana
- response field: use the SAME LANGUAGE as the user (Hindi input = Hindi response)
- response must be SHORT (under 12 words)
- state: always full English name (UP→Uttar Pradesh, MP→Madhya Pradesh)
- Extract numbers: "पाँच"→5, "दस"→10, "५०"→50, "five"→5, "hazaar"→1000, "hazar"→1000
- If user mentions quantity → set it in prefill (for create_listing) or entities
- If user mentions price/money → set pricePerUnit in prefill (for create_listing)
- If user mentions state → set full English state name
- Default unit is "kg" when quantity is given but no unit specified

EXAMPLES:
Input: "मुझे 5 किलो गेहूं बेचना है" → intent: create_listing, prefill: {cropType: "Wheat", quantity: 5, unit: "kg"}, response: "गेहूं की लिस्टिंग खोल रहे हैं"
Input: "मुझे 100 किलो चावल 3000 रुपये में बेचना है मध्य प्रदेश से" → intent: create_listing, prefill: {cropType: "Rice", quantity: 100, unit: "kg", pricePerUnit: 3000, state: "Madhya Pradesh"}, response: "चावल की लिस्टिंग खोल रहे हैं"
Input: "गेहूं बेचने वाले दिखाओ" → intent: search_produce, routeParams: {cropType: "Wheat"}, response: "गेहूं बेचने वाले दिखा रहे हैं"
Input: "मुझे गेहूं का भाव बताओ" → intent: search_market, routeParams: {commodity: "Wheat"}, response: "गेहूं का भाव देख रहे हैं"
Input: "गेहूं का भाव UP में" → intent: search_market, routeParams: {commodity: "Wheat", state: "Uttar Pradesh"}, response: "UP में गेहूं का भाव देख रहे हैं"
Input: "check my orders" → intent: check_orders, route: /orders, response: "Opening your orders"
Input: "मेरे पास 5 किलो गेहूं है, खाद चाहिए" → intent: barter, route: /barter, prefill: {itemWanted: "fertilizer", itemOffered: "wheat", qtyOffered: "5", text: "..."}

Return ONLY the JSON object, no markdown, no explanation.
"""


def parse_with_llm(text: str, language: str | None = None) -> dict:
    """Use Groq LLM to parse the voice transcript into a structured intent."""
    if not settings.groq_api_key:
        return _fallback_parse(text)

    lang_hint = f"The user spoke in: {language}" if language else ""
    user_msg = f"{lang_hint}\n\nTranscript: {text}"

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.voice_command_model,
                "messages": [
                    {"role": "system", "content": INTENT_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
            timeout=15,
        )
        response.raise_for_status()
        raw = response.json()["choices"][0]["message"]["content"]
        return _clean_json(raw)
    except (requests.RequestException, KeyError, IndexError, ValueError):
        return _fallback_parse(text)


def _clean_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        result = json.loads(cleaned)
        result.setdefault("intent", "unknown")
        result.setdefault("entities", {})
        result.setdefault("route", "/chat")
        result.setdefault("routeParams", {})
        result.setdefault("response", "")
        result.setdefault("prefill", {})
        return result
    except json.JSONDecodeError:
        return _fallback_parse(cleaned)


def _fallback_parse(text: str) -> dict:
    """Simple keyword matcher when Groq is unavailable."""
    t = text.lower().strip()

    # Produce / sell
    if any(kw in t for kw in ["sell", "bech", "बेच", "विक्री", "sellam"]):
        crop = _extract_crop(t)
        qty = _extract_number(t)
        price = _extract_price(t)
        state = _extract_state(t)
        prefill: dict = {}
        if crop:
            prefill["cropType"] = crop.title()
        if qty:
            prefill["quantity"] = qty
            prefill["unit"] = "kg"
        if price:
            prefill["pricePerUnit"] = price
        if state:
            prefill["state"] = state
        return {
            "intent": "create_listing",
            "entities": {"cropType": crop, "quantity": qty, "price": price, "state": state},
            "route": "/produce",
            "routeParams": {},
            "response": f"Opening produce listing" + (f" for {crop}" if crop else ""),
            "prefill": prefill,
        }

    # Search produce
    if any(kw in t for kw in ["seller", "buyers", "kharid", "खरीद", "विक्रेता", "buy"]):
        crop = _extract_crop(t)
        return {
            "intent": "search_produce",
            "entities": {"cropType": crop} if crop else {},
            "route": "/produce",
            "routeParams": {"cropType": crop} if crop else {},
            "response": f"Showing produce listings" + (f" for {crop}" if crop else ""),
            "prefill": {},
        }

    # Market / prices
    if any(kw in t for kw in ["price", "market", "mandi", "भाव", "दाम", "बाजार", "velai", "dikhao", "दिखाओ", "dikhao"]):
        crop = _extract_crop(t)
        state = _extract_state(t)
        params: dict = {}
        if crop:
            params["commodity"] = crop
        if state:
            params["state"] = state
        return {
            "intent": "search_market",
            "entities": {"commodity": crop, "state": state},
            "route": "/market",
            "routeParams": params,
            "response": f"Checking" + (f" {crop} " if crop else " ") + "prices" + (f" in {state}" if state else ""),
            "prefill": {},
        }

    # Orders
    if any(kw in t for kw in ["order", "ऑर्डर", "आदेश", "order"]):
        return {
            "intent": "check_orders",
            "entities": {},
            "route": "/orders",
            "routeParams": {},
            "response": "Opening your orders",
            "prefill": {},
        }

    # Crop doctor
    if any(kw in t for kw in ["disease", "detect", "leaf", "plant", "रोग", "पत्ती", "रोग"]):
        return {
            "intent": "crop_doctor",
            "entities": {},
            "route": "/crop",
            "routeParams": {},
            "response": "Opening crop disease detector",
            "prefill": {},
        }

    # Barter
    if any(kw in t for kw in ["barter", "swap", "exchange", "बदली", "बार्टर"]):
        return {
            "intent": "barter",
            "entities": {},
            "route": "/barter",
            "routeParams": {},
            "response": "Opening barter exchange",
            "prefill": {},
        }

    # Schemes
    if any(kw in t for kw in ["scheme", "yojana", "सरकारी", "योजना", "subsidy"]):
        return {
            "intent": "schemes",
            "entities": {},
            "route": "/schemes",
            "routeParams": {},
            "response": "Opening government schemes",
            "prefill": {},
        }

    # Default: send to chat assistant
    return {
        "intent": "ask_assistant",
        "entities": {"question": text},
        "route": "/chat",
        "routeParams": {},
        "response": "Let me ask the assistant about that",
        "prefill": {"question": text},
    }


def _extract_crop(text: str) -> str | None:
    """Pull a known crop name out of the text."""
    crops = [
        "rice", "wheat", "onion", "tomato", "potato", "cotton", "sugarcane",
        "soybean", "maize", "corn", "chilli", "pepper", "garlic", "ginger",
        "turmeric", "banana", "mango", "grapes", "pomegranate", "groundnut",
        "chana", "dal", "moong", "urad", "arhar", "mustard", "sunflower",
        "chawal", "gehu", "pyaz", "aloo", "tamatar", "kapaas", "ganna",
        "soybean", "makka", "mirchi", "lahsun", "adrak", "haldi",
        "चावल", "गेहूं", "प्याज", "टमाटर", "आलू", "कपास", "गन्ना",
        "सोयाबीन", "मक्का", "मिर्च", "लहसुन", "अदरक", "हल्दी",
        "तांदूळ", "गहू", "कांदा", "टोमॅटो", "बटाटा", "कापूस", "ऊस",
        "तामडी", "वेल", "वेंगाय", "उंद्री", "इंबु", "ंजिळ",
    ]
    t = text.lower()
    for crop in crops:
        if crop in t:
            return crop
    return None


def _extract_state(text: str) -> str | None:
    """Pull an Indian state name out of the text."""
    state_map = {
        "up": "Uttar Pradesh", "uttar pradesh": "Uttar Pradesh",
        "mp": "Madhya Pradesh", "madhya pradesh": "Madhya Pradesh",
        "mh": "Maharashtra", "maharashtra": "Maharashtra",
        "tn": "Tamil Nadu", "tamil nadu": "Tamil Nadu",
        "ap": "Andhra Pradesh", "andhra pradesh": "Andhra Pradesh",
        "ka": "Karnataka", "karnataka": "Karnataka",
        "tg": "Telangana", "telangana": "Telangana",
        "rj": "Rajasthan", "rajasthan": "Rajasthan",
        "gj": "Gujarat", "gujarat": "Gujarat",
        "wb": "West Bengal", "west bengal": "West Bengal",
        "hr": "Haryana", "haryana": "Haryana",
        "pb": "Punjab", "punjab": "Punjab",
        "br": "Bihar", "bihar": "Bihar",
        "jh": "Jharkhand", "jharkhand": "Jharkhand",
        "cg": "Chhattisgarh", "chhattisgarh": "Chhattisgarh",
        "od": "Odisha", "odisha": "Odisha",
        "kl": "Kerala", "kerala": "Kerala",
        "ga": "Goa", "goa": "Goa",
        "uk": "Uttarakhand", "uttarakhand": "Uttarakhand",
        "hp": "Himachal Pradesh", "himachal pradesh": "Himachal Pradesh",
        "jk": "Jammu and Kashmir", "jammu": "Jammu and Kashmir",
        "as": "Assam", "assam": "Assam",
        "mn": "Manipur", "manipur": "Manipur",
        "ml": "Meghalaya", "meghalaya": "Meghalaya",
        "nl": "Nagaland", "nagaland": "Nagaland",
        "mz": "Mizoram", "mizoram": "Mizoram",
        "sk": "Sikkim", "sikkim": "Sikkim",
        "ar": "Arunachal Pradesh", "arunachal": "Arunachal Pradesh",
        "tr": "Tripura", "tripura": "Tripura",
    }
    t = text.lower()
    # Try longest match first
    for key in sorted(state_map, key=len, reverse=True):
        if key in t:
            return state_map[key]
    return None


# Hindi number words
_HINDI_NUMS = {
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5,
    "छह": 6, "सात": 7, "आठ": 8, "नौ": 9, "दस": 10, "ग्यारह": 11,
    "बारह": 12, "तेरह": 13, "चौदह": 14, "पंद्रह": 15, "सोलह": 16,
    "सत्रह": 17, "अठारह": 18, "उन्नीस": 19, "बीस": 20, "तीस": 30,
    "चालीस": 40, "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80,
    "नब्बे": 90, "सौ": 100, "हज़ार": 1000, "हजार": 1000, "लाख": 100000,
}

def _extract_number(text: str) -> int | None:
    """Extract a numeric quantity from text. Handles digits, Hindi words, Devanagari digits."""
    t = text.lower().strip()
    # Devanagari digits → ASCII
    deva = str.maketrans("०१२३४५६७८९", "0123456789")
    t = t.translate(deva)
    # Try Hindi number words first (longest match)
    for word, val in sorted(_HINDI_NUMS.items(), key=lambda x: len(x[0]), reverse=True):
        if word in t:
            return val
    # Try regex for digits
    m = re.search(r'(\d+)', t)
    if m:
        return int(m.group(1))
    return None


def _extract_price(text: str) -> int | None:
    """Extract a monetary amount from text."""
    t = text.lower().strip()
    deva = str.maketrans("०१२३४५६७८९", "0123456789")
    t = t.translate(deva)
    # Look for price patterns: "2000 rupaye", "₹2000", "2000 mein", "hazaar"
    m = re.search(r'(\d[\d,]*)\s*(?:rupay|rupee|₹|rs\.?|में|mein|per)', t)
    if m:
        return int(m.group(1).replace(",", ""))
    # Hindi words for price
    for word, val in sorted(_HINDI_NUMS.items(), key=lambda x: len(x[0]), reverse=True):
        if word in t and any(kw in t for kw in ["rupay", "rupee", "₹", "rs", "mein", "में", "दाम", "price"]):
            return val
    return None
