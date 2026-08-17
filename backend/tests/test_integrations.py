"""Tests for the AI integrations folded into the backend: the Groq-backed
chat assistant (app.services.chat_ai) and the crop disease detector
(app.services.crop_detection). Both must degrade gracefully (no API key /
no model / no heavy deps installed) instead of crashing.
"""
import os
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "memory://")

from fastapi import HTTPException  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db import SessionLocal, engine  # noqa: E402
from app.models import Base, MarketPrice  # noqa: E402
from app.services import chat_ai, crop_detection  # noqa: E402


class ChatAiTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.session = SessionLocal()
        self._groq_key = settings.groq_api_key
        self._weather_key = settings.openweather_api_key
        settings.groq_api_key = None
        settings.openweather_api_key = None

    def tearDown(self):
        self.session.close()
        Base.metadata.drop_all(bind=engine)
        settings.groq_api_key = self._groq_key
        settings.openweather_api_key = self._weather_key

    def test_market_context_matches_seeded_commodity(self):
        self.session.add(MarketPrice(
            id="mp_1", commodity="Wheat", state="Maharashtra", district="Nagpur",
            mandi_name="Nagpur Mandi", modal_price=2200.0, recorded_on=datetime.now(timezone.utc),
        ))
        self.session.commit()

        context = chat_ai.get_market_context(self.session, "what is the wheat price today?")
        self.assertIsNotNone(context)
        self.assertIn("Wheat", context)
        self.assertIn("Nagpur Mandi", context)

    def test_market_context_returns_none_when_no_commodity_mentioned(self):
        self.session.add(MarketPrice(
            id="mp_2", commodity="Rice", state="Maharashtra", district="Nagpur",
            mandi_name="Nagpur Mandi", modal_price=1800.0, recorded_on=datetime.now(timezone.utc),
        ))
        self.session.commit()

        context = chat_ai.get_market_context(self.session, "how is my crop looking this season?")
        self.assertIsNone(context)

    def test_weather_context_skipped_without_api_key(self):
        context = chat_ai.get_weather_context("what's the weather like today?")
        self.assertIsNone(context)

    def test_build_messages_includes_provided_context(self):
        messages = chat_ai.build_messages("hello", "Wheat: Rs.2200/quintal", "Nagpur: sunny, 30C")
        system_message = messages[0]["content"]
        self.assertIn("Wheat: Rs.2200/quintal", system_message)
        self.assertIn("Nagpur: sunny, 30C", system_message)
        self.assertEqual(messages[1], {"role": "user", "content": "hello"})

    def test_ask_groq_falls_back_to_static_tip_without_api_key(self):
        reply_hi, sources_hi = chat_ai.ask_groq(self.session, "kya karu", "hi")
        self.assertIn("Mitti", reply_hi)
        self.assertEqual(sources_hi, ["ICAR / Krishi Vigyan Kendra guidance"])

        reply_en, sources_en = chat_ai.ask_groq(self.session, "what should I do", "en")
        self.assertIn("soil", reply_en)
        self.assertEqual(sources_en, ["ICAR / Krishi Vigyan Kendra guidance"])


class CropDetectionTests(unittest.TestCase):
    def test_known_class_name_parses_plant_and_disease(self):
        plant, disease, is_healthy = crop_detection._parse_class_name("Tomato_Late_blight")
        self.assertEqual(plant, "Tomato")
        self.assertEqual(disease, "Late Blight")
        self.assertFalse(is_healthy)

    def test_unknown_class_name_falls_back_gracefully(self):
        plant, disease, is_healthy = crop_detection._parse_class_name("Something_Unseen")
        self.assertEqual(plant, "Something_Unseen")
        self.assertEqual(disease, "Unknown")
        self.assertFalse(is_healthy)

    def test_quality_check_flags_a_dark_blank_image(self):
        import cv2
        import numpy as np

        dark_image = np.zeros((160, 160, 3), dtype=np.uint8)
        issues, metrics = crop_detection._check_photo_quality(cv2, np, dark_image)
        self.assertTrue(any("dark" in issue for issue in issues))
        self.assertIn("brightness", metrics)

    def test_detect_disease_rejects_unreadable_bytes(self):
        # cv2/numpy are installed in this environment, so garbage bytes fail
        # at the "is this even a photo" step (422), not the model-availability
        # step. On a machine without opencv/tensorflow this would 503 instead -
        # both are "fail gracefully, don't crash" outcomes.
        with self.assertRaises(HTTPException) as ctx:
            crop_detection.detect_disease(b"not-a-real-image")
        self.assertIn(ctx.exception.status_code, (422, 503))

    def test_detect_disease_runs_real_inference_when_model_available(self):
        try:
            import cv2
            import numpy as np
        except ImportError:
            self.skipTest("opencv/numpy not installed")

        model_path = os.path.join(settings.crop_model_root, "phase4_outputs", "model3_final.keras")
        class_names_path = os.path.join(settings.crop_model_root, "phase1_outputs", "class_names.txt")
        if not (os.path.exists(model_path) and os.path.exists(class_names_path)):
            self.skipTest("trained crop model files not present")

        rng = np.random.default_rng(0)
        leaf_like = np.full((300, 300, 3), (40, 160, 40), dtype=np.uint8)
        noise = rng.integers(-25, 25, leaf_like.shape, dtype=np.int16)
        leaf_like = np.clip(leaf_like.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        ok, buffer = cv2.imencode(".jpg", leaf_like)
        self.assertTrue(ok)

        result = crop_detection.detect_disease(buffer.tobytes())

        self.assertIn(result["status"], ("ok", "predicted_with_warnings", "quality_rejected"))
        if result["status"] != "quality_rejected":
            self.assertEqual(result["source"], "own_model")
            self.assertIn("plant", result["top_prediction"])
            self.assertIn("disease", result["top_prediction"])
            self.assertEqual(len(result["top3"]), 3)


if __name__ == "__main__":
    unittest.main()
