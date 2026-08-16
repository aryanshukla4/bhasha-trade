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
        app.state.limiter.enabled = False
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

    def test_dto_column_defaults_serialization(self):
        session = self.login()
        headers = {"Authorization": f"Bearer {session['accessToken']}"}
        response = self.client.post("/api/produce", headers=headers, json={"cropType": "Rice", "quantity": 50, "unit": "kg", "pricePerUnit": 30})
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertEqual(data["status"], "active")
        self.assertIsNotNone(data["created_at"])

    def test_hindi_vernacular_barter_parsing(self):
        farmer = self.login("+919000000003", "farmer", "Farmer Ramesh")
        headers = {"Authorization": f"Bearer {farmer['accessToken']}"}
        response = self.client.post("/api/barter/parse-request", headers=headers, json={"text": "मुझे गेहूं के बदले 4 किलो खाद चाहिए"})
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["itemWanted"], "fertilizer")
        self.assertEqual(data["itemOffered"], "wheat")
        self.assertFalse(data["needsClarification"])

    def test_invalid_order_action_rejection(self):
        farmer = self.login("+919000000001", "farmer", "Farmer Raju")
        buyer = self.login("+919000000002", "buyer", "Buyer Priya")
        farmer_headers = {"Authorization": f"Bearer {farmer['accessToken']}"}
        buyer_headers = {"Authorization": f"Bearer {buyer['accessToken']}"}

        response = self.client.post("/api/produce", headers=farmer_headers, json={"cropType": "Wheat", "quantity": 10, "unit": "kg", "pricePerUnit": 20})
        listing_id = response.json()["data"]["id"]
        response = self.client.post(f"/api/produce/{listing_id}/interest", headers=buyer_headers, json={})
        order_id = response.json()["data"]["id"]

        response = self.client.post(f"/api/orders/{order_id}/reject", headers=farmer_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "cancelled")

        from app.services.domain_service import DomainService
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            DomainService().order_action(None, None, order_id, "invalid_action")
        self.assertEqual(ctx.exception.status_code, 422)

    def test_case_insensitive_bearer_auth(self):
        session = self.login()
        headers = {"Authorization": f"bearer {session['accessToken']}"}
        response = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(response.status_code, 200)

    def test_formatted_phone_sanitization(self):
        response = self.client.post("/api/auth/send-otp", json={"phone": "+91 (987) 654-3210"})
        self.assertEqual(response.status_code, 202)

    def test_produce_deletion_cancels_orders(self):
        farmer = self.login("+919000000001", "farmer", "Farmer Raju")
        buyer = self.login("+919000000002", "buyer", "Buyer Priya")
        farmer_headers = {"Authorization": f"Bearer {farmer['accessToken']}"}
        buyer_headers = {"Authorization": f"Bearer {buyer['accessToken']}"}

        response = self.client.post("/api/produce", headers=farmer_headers, json={"cropType": "Wheat", "quantity": 10, "unit": "kg", "pricePerUnit": 20})
        listing_id = response.json()["data"]["id"]
        response = self.client.post(f"/api/produce/{listing_id}/interest", headers=buyer_headers, json={})
        order_id = response.json()["data"]["id"]

        response = self.client.delete(f"/api/produce/{listing_id}", headers=farmer_headers)
        self.assertEqual(response.status_code, 204)

        response = self.client.get(f"/api/orders/{order_id}", headers=buyer_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "cancelled")

    def test_auth_refresh_logout_and_profile_update(self):
        session = self.login("+919111111111", "farmer", "Ramesh Kumar")
        headers = {"Authorization": f"Bearer {session['accessToken']}"}

        # Profile update
        response = self.client.put("/api/auth/profile", headers=headers, json={"name": "Ramesh Singh", "preferredLanguage": "mr"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["name"], "Ramesh Singh")
        self.assertEqual(response.json()["data"]["preferredLanguage"], "mr")

        # Refresh token
        response = self.client.post("/api/auth/refresh", json={"refreshToken": session["refreshToken"]})
        self.assertEqual(response.status_code, 200)
        new_token = response.json()["data"]["accessToken"]
        self.assertIsNotNone(new_token)

        # Logout
        response = self.client.post("/api/auth/logout", json={"refreshToken": session["refreshToken"]})
        self.assertEqual(response.status_code, 204)

    def test_languages_and_user_language(self):
        session = self.login()
        headers = {"Authorization": f"Bearer {session['accessToken']}"}

        response = self.client.get("/api/languages")
        self.assertEqual(response.status_code, 200)
        langs = response.json()["data"]
        self.assertTrue(any(l["code"] == "hi" for l in langs))

        response = self.client.put("/api/user/language", headers=headers, json={"language": "ta"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["preferredLanguage"], "ta")

    def test_market_trends_and_nearby_mandis(self):
        response = self.client.get("/api/market/trends/Wheat")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()["data"]), 1)

        response = self.client.get("/api/market/nearby-mandis", params={"lat": 22.7196, "lon": 75.8577})
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(response.json()["data"]), 3)

    def test_produce_browse_and_update(self):
        farmer = self.login("+919000000010", "farmer", "Farmer Prem")
        headers = {"Authorization": f"Bearer {farmer['accessToken']}"}

        response = self.client.post("/api/produce", headers=headers, json={"cropType": "Corn", "quantity": 200, "unit": "kg", "pricePerUnit": 18, "state": "Madhya Pradesh"})
        self.assertEqual(response.status_code, 201)
        item_id = response.json()["data"]["id"]

        # Browse listings with query filter
        response = self.client.get("/api/produce", params={"cropType": "Corn", "state": "Madhya Pradesh"})
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()["data"]), 1)

        # Update listing
        response = self.client.put(f"/api/produce/{item_id}", headers=headers, json={"pricePerUnit": 20, "quantity": 180})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["price_per_unit"], 20)
        self.assertEqual(response.json()["data"]["quantity"], 180)

    def test_orders_list_and_cancel_route(self):
        farmer = self.login("+919000000020", "farmer", "Farmer Dev")
        buyer = self.login("+919000000021", "buyer", "Buyer Ankit")
        farmer_headers = {"Authorization": f"Bearer {farmer['accessToken']}"}
        buyer_headers = {"Authorization": f"Bearer {buyer['accessToken']}"}

        response = self.client.post("/api/produce", headers=farmer_headers, json={"cropType": "Barley", "quantity": 15, "unit": "kg", "pricePerUnit": 40})
        item_id = response.json()["data"]["id"]

        response = self.client.post(f"/api/produce/{item_id}/interest", headers=buyer_headers, json={})
        order_id = response.json()["data"]["id"]

        # Accept order
        response = self.client.post(f"/api/orders/{order_id}/accept", headers=farmer_headers)
        self.assertEqual(response.status_code, 200)

        # Get orders list
        response = self.client.get("/api/orders", headers=farmer_headers)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()["data"]), 1)

        # Cancel order
        response = self.client.post(f"/api/orders/{order_id}/cancel", headers=farmer_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "cancelled")

    def test_barter_history(self):
        farmer = self.login("+919000000030", "farmer", "Farmer Som")
        headers = {"Authorization": f"Bearer {farmer['accessToken']}"}

        self.client.post("/api/barter/request", headers=headers, json={"itemWanted": "fertilizer", "itemOffered": "wheat"})
        response = self.client.get("/api/barter/history", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["data"]), 1)

    def test_chat_advisory_voice_and_history(self):
        farmer = self.login("+919000000040", "farmer", "Farmer Vikrum")
        headers = {"Authorization": f"Bearer {farmer['accessToken']}"}

        # Ask chat query
        response = self.client.post("/api/chat/ask", headers=headers, json={"text": "gehu me konsi khad dale?", "language": "hi"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("response", response.json()["data"])

        # Chat history
        response = self.client.get("/api/chat/history", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()["data"]), 1)

        # Voice to text
        response = self.client.post("/api/chat/voice-to-text", headers=headers, json={"transcript": "crop query", "language": "en"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["text"], "crop query")

        # Text to voice
        response = self.client.post("/api/chat/text-to-voice", headers=headers, json={"text": "weather report", "language": "hi"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["text"], "weather report")

    def test_crop_advisory_and_disease_detection(self):
        farmer = self.login("+919000000050", "farmer", "Farmer Kalu")
        headers = {"Authorization": f"Bearer {farmer['accessToken']}"}

        response = self.client.post("/api/crop/detect-disease", headers=headers, json={"photoUrl": "https://storage.example/leaf.jpg"})
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json()["data"]["photoUrl"], "https://storage.example/leaf.jpg")

        response = self.client.get("/api/crop/advisory/wheat", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["cropType"], "wheat")

    def test_weather_api(self):
        response = self.client.get("/api/weather", params={"lat": 22.7196, "lon": 75.8577})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["provider"], "demo")

    def test_schemes_and_eligibility(self):
        farmer = self.login("+919000000060", "farmer", "Farmer Balu")
        headers = {"Authorization": f"Bearer {farmer['accessToken']}"}

        response = self.client.get("/api/schemes")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()["data"]), 1)

        response = self.client.get("/api/schemes/pm-kisan")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["id"], "pm-kisan")

        response = self.client.post("/api/schemes/pm-kisan/check-eligibility", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["data"]["requiresReview"])

    def test_notifications_list(self):
        farmer = self.login("+919000000070", "farmer", "Farmer Sunder")
        headers = {"Authorization": f"Bearer {farmer['accessToken']}"}

        response = self.client.get("/api/notifications", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json()["data"], list)


if __name__ == "__main__":
    unittest.main()


