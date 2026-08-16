import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "memory://")

from fastapi.testclient import TestClient  # noqa: E402

from app.bootstrap import initialize_database  # noqa: E402
from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402


class BhashaTradeApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        initialize_database()

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def login(self, phone="+919876543210", role="farmer", name="Test User"):
        response = self.client.post("/api/auth/send-otp", json={"phone": phone})
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["data"]["devOtp"], "123456")
        response = self.client.post("/api/auth/verify-otp", json={"phone": phone, "otp": "123456", "role": role, "name": name})
        self.assertEqual(response.status_code, 200)
        return response.json()["data"]

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["service"], "bhasha-trade-fastapi")

    def test_authenticated_produce_lifecycle(self):
        session = self.login()
        headers = {"Authorization": f"Bearer {session['accessToken']}"}
        response = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        response = self.client.post("/api/produce", headers=headers, json={"cropType": "Wheat", "quantity": 100, "unit": "kg", "pricePerUnit": 25})
        self.assertEqual(response.status_code, 201)
        listing_id = response.json()["data"]["id"]
        response = self.client.get(f"/api/produce/{listing_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["crop_type"], "Wheat")

    def test_market_api_and_auth_rejection(self):
        response = self.client.get("/api/market/prices", params={"commodity": "Wheat"})
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()["data"]), 1)
        response = self.client.post("/api/produce", json={"cropType": "Wheat", "quantity": 1, "unit": "kg", "pricePerUnit": 25})
        self.assertEqual(response.status_code, 401)

    def test_barter_matching_connect_and_confirm(self):
        farmer = self.login("+919000000001", "farmer", "Farmer Raju")
        headers = {"Authorization": f"Bearer {farmer['accessToken']}"}

        response = self.client.get("/api/barter/dealers", params={"item": "fertilizer"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["data"]), 1)

        response = self.client.post("/api/barter/request", headers=headers, json={"itemWanted": "fertilizer", "itemOffered": "wheat", "qtyOffered": 4})
        self.assertEqual(response.status_code, 201)
        request_id = response.json()["data"]["id"]

        response = self.client.get(f"/api/barter/matches/{request_id}", headers=headers)
        self.assertEqual(response.status_code, 200)
        matches = response.json()["data"]
        self.assertEqual(len(matches), 1)
        dealer_id = matches[0]["dealer"]["id"]

        response = self.client.post(f"/api/barter/{request_id}/connect", headers=headers, json={"dealerId": dealer_id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "connected")

        response = self.client.post(f"/api/barter/{request_id}/confirm", headers=headers, json={"dealerId": dealer_id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "confirmed")

    def test_reviews_and_verification_status(self):
        farmer = self.login("+919000000001", "farmer", "Farmer Raju")
        buyer = self.login("+919000000002", "buyer", "Buyer Priya")
        farmer_headers = {"Authorization": f"Bearer {farmer['accessToken']}"}
        buyer_headers = {"Authorization": f"Bearer {buyer['accessToken']}"}
        farmer_id = farmer["user"]["id"]

        response = self.client.post("/api/produce", headers=farmer_headers, json={"cropType": "Wheat", "quantity": 10, "unit": "kg", "pricePerUnit": 20})
        listing_id = response.json()["data"]["id"]
        response = self.client.post(f"/api/produce/{listing_id}/interest", headers=buyer_headers, json={})
        order_id = response.json()["data"]["id"]
        self.client.post(f"/api/orders/{order_id}/accept", headers=farmer_headers)
        self.client.post(f"/api/orders/{order_id}/complete", headers=buyer_headers)

        response = self.client.post("/api/reviews", headers=buyer_headers, json={"toUserId": farmer_id, "orderId": order_id, "rating": 5, "comment": "Great!"})
        self.assertEqual(response.status_code, 201)

        response = self.client.get(f"/api/reviews/{farmer_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["data"]), 1)

        response = self.client.get(f"/api/users/{farmer_id}/verification-status")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["userId"], farmer_id)

        response = self.client.post("/api/reviews", headers=farmer_headers, json={"toUserId": farmer_id, "rating": 5})
        self.assertEqual(response.status_code, 422)

    def test_notification_subscribe(self):
        session = self.login()
        headers = {"Authorization": f"Bearer {session['accessToken']}"}
        response = self.client.post("/api/notifications/subscribe", headers=headers, json={"endpoint": "https://push.example/abc"})
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["data"]["subscribed"])


if __name__ == "__main__":
    unittest.main()
