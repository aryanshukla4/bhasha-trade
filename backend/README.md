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
