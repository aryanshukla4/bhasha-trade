# Bhasha Trade - FastAPI Backend

FastAPI, PostgreSQL / SQLite backend for Bhasha Trade.

## Quickstart Guide

### 1. Environment Setup (.env)
First, set up your local environment variables.
```powershell
cd backend
Copy-Item .env.example .env
```
Open `.env` and make sure your database is set to SQLite for local development:
```env
DATABASE_URL=sqlite:///./data/bhasha-trade.sqlite
JWT_SECRET=your_random_secret_here
GROQ_API_KEY=your_groq_api_key_here
CROP_MODEL_ROOT=./crop_model
```

### 2. Install Dependencies
Create a virtual environment and install the required packages.
```powershell
# Navigate to the backend directory if you aren't there already
cd backend

# Create and activate the virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

### 3. Start Live Server
Once the virtual environment is activated and dependencies are installed, start the server:
```powershell
python -m uvicorn app.main:app --reload --port 8000
```
- **Health Check**: `http://localhost:8000/health`
- **Swagger UI (Test API)**: `http://localhost:8000/docs`
- **ReDoc Docs**: `http://localhost:8000/redoc`

### 4. Run Test Suite
```powershell
pytest tests -v
```
Runs the 23-test API verification suite in-memory with zero external server dependencies.

### 5. AI Features Configuration
- **Chat assistant** (`/api/chat/ask`): Requires `GROQ_API_KEY` in `.env` for real LLM replies. Without it, the endpoint safely returns a static farming tip.
- **Crop disease detection** (`/api/crop/detect-disease`): Uses a locally trained ML model. The model files must be placed exactly at:
  - `backend/crop_model/phase4_outputs/model3_final.keras`
  - `backend/crop_model/phase1_outputs/class_names.txt`
  Ensure `CROP_MODEL_ROOT=./crop_model` is in your `.env`. Without the model files installed, the endpoint safely returns a `503 Service Unavailable` instead of crashing the server. An optional `KINDWISE_API_KEY` can be added for a second-opinion fallback on low-confidence predictions.

### 6. Optional Local Postgres + Redis Setup
For production-like local testing:
```powershell
docker compose up -d postgres redis
```
Then update your `.env` file:
```env
DATABASE_URL=postgresql+psycopg://bhasha_trade:bhasha_trade_dev@localhost:5432/bhasha_trade
REDIS_URL=redis://localhost:6379/0
```
