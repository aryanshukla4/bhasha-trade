# FastAPI Backend

FastAPI, PostgreSQL / SQLite backend for Bhasha Trade.

## Quickstart

### 1. Install Dependencies
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Start Live Server
```powershell
python -m uvicorn app.main:app --reload --port 8000
```
- **Health Check**: `http://localhost:8000/health`
- **Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Docs**: `http://localhost:8000/redoc`

### 3. Run Test Suite
```powershell
pytest tests -v
```
Runs the 23-test API verification suite in-memory with zero external server dependencies.

### 4. Optional Local Postgres + Redis Setup
For local production testing with PostgreSQL and Redis:
```powershell
docker compose up -d postgres redis
```
Then set in your `.env` file:
```env
DATABASE_URL=postgresql+psycopg://bhasha_trade:bhasha_trade_dev@localhost:5432/bhasha_trade
REDIS_URL=redis://localhost:6379/0
```
If those ports are already taken by another project's containers, change the left side
of the `ports:` mapping in `docker-compose.yml` (e.g. `"5433:5432"`) and update `DATABASE_URL`/`REDIS_URL` to match.

### 5. Optional: AI features
- **Chat assistant** (`/api/chat/ask`): set `GROQ_API_KEY` in `.env` for real LLM replies (with live mandi price + weather context). Without it, the endpoint still works and returns a static farming tip.
- **Crop disease detection** (`/api/crop/detect-disease`, multipart file upload): requires `pip install opencv-python-headless numpy tensorflow` (already listed in requirements.txt, but heavy - skip if you don't need this feature) plus a trained model dropped at `CROP_MODEL_ROOT/phase4_outputs/model3_final.keras` and `CROP_MODEL_ROOT/phase1_outputs/class_names.txt` (see `predict_leaf.py` at the repo root for the original training pipeline). Without the model files installed, the endpoint returns `503` instead of crashing the server. Optional `KINDWISE_API_KEY` gives a second-opinion fallback on low-confidence predictions.
