from app.db import engine, SessionLocal
from app.models import Base, Dealer, MarketPrice

SEED_PRICES = [
    {"id": "mp-wheat-indore", "commodity": "Wheat", "state": "Madhya Pradesh", "district": "Indore", "mandi_name": "Indore Mandi", "modal_price": 2425},
    {"id": "up-wheat-lucknow", "commodity": "Wheat", "state": "Uttar Pradesh", "district": "Lucknow", "mandi_name": "Lucknow Mandi", "modal_price": 2380},
    {"id": "mh-onion-nashik", "commodity": "Onion", "state": "Maharashtra", "district": "Nashik", "mandi_name": "Lasalgaon Mandi", "modal_price": 1800},
]

SEED_DEALERS = [
    {
        "id": "dealer-krishi",
        "name": "Krishi Seva Kendra",
        "location": "Indore, Madhya Pradesh",
        "items_available": {"fertilizer": {"openToBarter": True}, "seeds": {"openToBarter": True}},
        "verification_status": "verified",
    },
]


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    _seed()


def _seed() -> None:
    with SessionLocal() as session:
        if not session.query(MarketPrice).first():
            session.add_all(MarketPrice(**row) for row in SEED_PRICES)
        if not session.query(Dealer).first():
            session.add_all(Dealer(**row) for row in SEED_DEALERS)
        session.commit()
