import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "mandi_prices.db"


def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the table and load a few sample rows if empty."""
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS mandi_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            crop TEXT NOT NULL,
            market TEXT NOT NULL,
            price_per_quintal INTEGER NOT NULL,
            date TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS price_cache (
            crop TEXT NOT NULL,
            date TEXT NOT NULL,
            content TEXT NOT NULL,
            PRIMARY KEY (crop, date)
        )
    """)
    


if __name__ == "__main__":
    init_db()
    print(f"Database ready at {DB_PATH}")
