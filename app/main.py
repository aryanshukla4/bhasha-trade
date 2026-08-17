import os
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.prompts import build_messages
from app.retrieval import get_market_context
from app.weather import get_weather_context
from app.database import init_db

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

app = FastAPI(title="Farmer Chatbot API")

# Allow your website's frontend to call this API.
# Replace "*" with your actual domain before going live.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not GROQ_API_KEY:
        return ChatResponse(reply="Server isn't configured with an API key yet.")

    market_context = get_market_context(request.message)
    weather_context = get_weather_context(request.message)
    messages = build_messages(request.message, market_context, weather_context)

    response = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": 0.4,
        },
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    reply = data["choices"][0]["message"]["content"]

    return ChatResponse(reply=reply)


@app.get("/health")
def health():
    return {"status": "ok"}