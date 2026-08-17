"""Crop leaf disease detection: own trained model (Model 3) + Kindwise
API fallback for low-confidence cases.

Ported from the AdityaMl branch's predict_leaf.py. Heavy deps
(tensorflow/opencv/numpy) are imported lazily inside functions so the
rest of the backend still boots and the test suite still passes even
when they aren't installed - callers get a clear 503 instead of an
import-time crash.
"""
import base64
import os

import requests
from fastapi import HTTPException

from app.core.config import settings

IMG_SIZE = (160, 160)
KINDWISE_ENDPOINT = "https://crop.kindwise.com/api/v1/identification"

CLASS_INFO = {
    "Pepper__bell___Bacterial_spot": ("Bell Pepper", "Bacterial Spot", False),
    "Pepper__bell___healthy": ("Bell Pepper", "Healthy", True),
    "Potato___Early_blight": ("Potato", "Early Blight", False),
    "Potato___Late_blight": ("Potato", "Late Blight", False),
    "Potato___healthy": ("Potato", "Healthy", True),
    "Tomato_Bacterial_spot": ("Tomato", "Bacterial Spot", False),
    "Tomato_Early_blight": ("Tomato", "Early Blight", False),
    "Tomato_Late_blight": ("Tomato", "Late Blight", False),
    "Tomato_Leaf_Mold": ("Tomato", "Leaf Mold", False),
    "Tomato_Septoria_leaf_spot": ("Tomato", "Septoria Leaf Spot", False),
    "Tomato_Spider_mites_Two_spotted_spider_mite": ("Tomato", "Spider Mites (Two-Spotted)", False),
    "Tomato__Target_Spot": ("Tomato", "Target Spot", False),
    "Tomato__Tomato_YellowLeaf__Curl_Virus": ("Tomato", "Yellow Leaf Curl Virus", False),
    "Tomato__Tomato_mosaic_virus": ("Tomato", "Mosaic Virus", False),
    "Tomato_healthy": ("Tomato", "Healthy", True),
}

_cached_assets = None


def _parse_class_name(raw):
    return CLASS_INFO.get(raw, (raw, "Unknown", False))


def _load_assets():
    global _cached_assets
    if _cached_assets is not None:
        return _cached_assets
    try:
        import tensorflow as tf
    except ImportError:
        raise HTTPException(503, "Crop disease detection is not available: tensorflow is not installed on this server.")

    model_path = os.path.join(settings.crop_model_root, "phase4_outputs", "model3_final.keras")
    class_names_path = os.path.join(settings.crop_model_root, "phase1_outputs", "class_names.txt")
    if not os.path.exists(model_path) or not os.path.exists(class_names_path):
        raise HTTPException(503, f"Crop disease model files not found under CROP_MODEL_ROOT={settings.crop_model_root}.")

    model = tf.keras.models.load_model(model_path)
    with open(class_names_path) as f:
        class_names = [line.strip() for line in f if line.strip()]
    _cached_assets = (model, class_names)
    return _cached_assets


def _check_photo_quality(cv2, np, img_bgr):
    issues = []
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    if blur_score < 60:
        issues.append(f"Image looks blurry (sharpness score {blur_score:.1f}, want >60). Hold the camera steady and refocus.")

    brightness = gray.mean()
    if brightness < 40:
        issues.append(f"Image is too dark (brightness {brightness:.1f}/255). Try better lighting.")
    elif brightness > 220:
        issues.append(f"Image is overexposed (brightness {brightness:.1f}/255). Avoid direct harsh sunlight/flash.")

    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    green_mask = cv2.inRange(hsv, (25, 30, 30), (95, 255, 255))
    green_ratio = green_mask.mean() / 255.0
    if green_ratio < 0.10:
        issues.append(f"Leaf doesn't fill much of the frame ({green_ratio*100:.1f}% green pixels). Move closer.")

    return issues, {"blur_score": float(blur_score), "brightness": float(brightness), "green_ratio": float(green_ratio)}


def _enhance_photo(cv2, img_bgr):
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    img_bgr = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)
    blurred = cv2.GaussianBlur(img_bgr, (0, 0), sigmaX=2)
    img_bgr = cv2.addWeighted(img_bgr, 1.3, blurred, -0.3, 0)
    return cv2.fastNlMeansDenoisingColored(img_bgr, None, h=5, hColor=5, templateWindowSize=7, searchWindowSize=21)


def _predict_with_tta(cv2, np, model, img_bgr, n_augments=5):
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_rgb = cv2.resize(img_rgb, IMG_SIZE)
    base = img_rgb.astype(np.float32)

    variants = [base]
    rng = np.random.default_rng(42)
    for _ in range(n_augments - 1):
        v = base.copy()
        angle = rng.uniform(-15, 15)
        h, w = v.shape[:2]
        m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        v = cv2.warpAffine(v, m, (w, h), borderMode=cv2.BORDER_REFLECT)
        if rng.random() < 0.5:
            v = cv2.flip(v, 1)
        factor = rng.uniform(0.85, 1.15)
        v = np.clip(v * factor, 0, 255)
        variants.append(v)

    batch = np.stack(variants, axis=0)
    preds = model.predict(batch, verbose=0)
    return preds.mean(axis=0)


def _predict_with_kindwise(image_bytes: bytes) -> dict:
    if not settings.kindwise_api_key:
        return {"error": "Kindwise API key not configured. Set KINDWISE_API_KEY env var."}
    try:
        image_b64 = base64.b64encode(image_bytes).decode("ascii")
        response = requests.post(
            KINDWISE_ENDPOINT,
            params={"details": "taxonomy"},
            headers={"Api-Key": settings.kindwise_api_key},
            json={"images": [image_b64]},
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        crop_suggestions = data.get("result", {}).get("crop", {}).get("suggestions", [])
        disease_suggestions = data.get("result", {}).get("disease", {}).get("suggestions", [])
        top_crop = crop_suggestions[0] if crop_suggestions else None
        top_disease = disease_suggestions[0] if disease_suggestions else None
        return {
            "source": "kindwise_api",
            "plant": top_crop["name"] if top_crop else "Unknown",
            "disease": top_disease["name"] if top_disease else "Unknown",
            "confidence": round((top_disease["probability"] if top_disease else 0) * 100, 1),
        }
    except requests.exceptions.RequestException as e:
        return {"error": f"Kindwise API call failed: {e}"}


def detect_disease(image_bytes: bytes) -> dict:
    try:
        import cv2
        import numpy as np
    except ImportError:
        raise HTTPException(503, "Crop disease detection is not available: opencv-python/numpy are not installed on this server.")

    model, class_names = _load_assets()

    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(422, "Could not read uploaded image - is it a valid photo file?")

    issues, metrics = _check_photo_quality(cv2, np, img_bgr)
    if issues:
        return {"status": "quality_rejected", "issues": issues, "metrics": metrics,
                "message": "Photo quality too low for a reliable prediction. Please retake following the tips above."}

    img_bgr = _enhance_photo(cv2, img_bgr)
    avg_pred = _predict_with_tta(cv2, np, model, img_bgr, n_augments=5)

    top3_idx = np.argsort(avg_pred)[::-1][:3]
    top3 = []
    for i in top3_idx:
        plant, disease, is_healthy = _parse_class_name(class_names[i])
        top3.append({"plant": plant, "disease": disease, "is_healthy": is_healthy, "confidence": round(float(avg_pred[i]) * 100, 1)})

    result = {"status": "ok", "issues": issues, "metrics": metrics, "source": "own_model", "top_prediction": top3[0], "top3": top3}

    own_confidence = top3[0]["confidence"] / 100.0
    if own_confidence < settings.crop_confidence_threshold:
        kindwise_result = _predict_with_kindwise(image_bytes)
        result["fallback_triggered"] = True
        result["kindwise_result"] = kindwise_result
        if "error" not in kindwise_result and kindwise_result["confidence"] > top3[0]["confidence"]:
            result["final_recommendation"] = kindwise_result
        else:
            result["final_recommendation"] = top3[0]
    else:
        result["fallback_triggered"] = False
        result["final_recommendation"] = top3[0]

    return result
