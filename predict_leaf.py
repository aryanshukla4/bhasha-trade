"""
predict_leaf.py
================
Full prediction pipeline:
  1. Quality check (reject truly bad photos, ask for a retake)
  2. Lightweight enhancement (CLAHE, sharpen, denoise)
  3. Predict with YOUR trained model (Model 3), using test-time augmentation
  4. If your model's confidence is low, fall back to Kindwise's crop.health
     API (a production model trained on 150M+ real field photos) for a
     second opinion — so the demo still gives a good answer even on
     conditions your own model hasn't seen.

Get a free Kindwise API key (100 free credits) at: https://admin.kindwise.com/
"""

import os
import sys
import base64
import numpy as np
import cv2
import requests
import tensorflow as tf

# -------------------------------------------------------------------
# Config
# -------------------------------------------------------------------
PROJECT_ROOT = os.environ.get("PROJECT_ROOT", "/home/aditya/projects/plantdisease")
MODEL_PATH = os.path.join(PROJECT_ROOT, "phase4_outputs", "model3_final.keras")
CLASS_NAMES_PATH = os.path.join(PROJECT_ROOT, "phase1_outputs", "class_names.txt")
IMG_SIZE = (160, 160)

# Fallback triggers if your own model's top prediction is below this,
# OR if the quality check flagged issues. Tune based on your Phase 5
# numbers — 69.6% was your real-world field accuracy, so anything your
# model is notably less sure about than that is worth double-checking.
CONFIDENCE_FALLBACK_THRESHOLD = 0.55

KINDWISE_API_KEY = os.environ.get("KINDWISE_API_KEY", "your_api_key_here")
KINDWISE_ENDPOINT = "https://crop.kindwise.com/api/v1/identification"


# -------------------------------------------------------------------
# Raw folder name -> (plant name, disease name, is_healthy)
# -------------------------------------------------------------------
CLASS_INFO = {
    "Pepper__bell___Bacterial_spot":               ("Bell Pepper", "Bacterial Spot", False),
    "Pepper__bell___healthy":                      ("Bell Pepper", "Healthy",        True),
    "Potato___Early_blight":                       ("Potato",      "Early Blight",   False),
    "Potato___Late_blight":                        ("Potato",      "Late Blight",    False),
    "Potato___healthy":                            ("Potato",      "Healthy",        True),
    "Tomato_Bacterial_spot":                       ("Tomato",      "Bacterial Spot", False),
    "Tomato_Early_blight":                         ("Tomato",      "Early Blight",   False),
    "Tomato_Late_blight":                          ("Tomato",      "Late Blight",    False),
    "Tomato_Leaf_Mold":                            ("Tomato",      "Leaf Mold",      False),
    "Tomato_Septoria_leaf_spot":                   ("Tomato",      "Septoria Leaf Spot", False),
    "Tomato_Spider_mites_Two_spotted_spider_mite": ("Tomato",      "Spider Mites (Two-Spotted)", False),
    "Tomato__Target_Spot":                         ("Tomato",      "Target Spot",    False),
    "Tomato__Tomato_YellowLeaf__Curl_Virus":       ("Tomato",      "Yellow Leaf Curl Virus", False),
    "Tomato__Tomato_mosaic_virus":                 ("Tomato",      "Mosaic Virus",   False),
    "Tomato_healthy":                              ("Tomato",      "Healthy",        True),
}


def parse_class_name(raw_class_name):
    if raw_class_name in CLASS_INFO:
        return CLASS_INFO[raw_class_name]
    return (raw_class_name, "Unknown", False)


# -------------------------------------------------------------------
# STEP 1 — Load model + class names
# -------------------------------------------------------------------
def load_assets():
    model = tf.keras.models.load_model(MODEL_PATH)
    with open(CLASS_NAMES_PATH) as f:
        class_names = [line.strip() for line in f if line.strip()]
    return model, class_names


# -------------------------------------------------------------------
# STEP 2 — Quality check
# -------------------------------------------------------------------
def check_photo_quality(img_bgr):
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

    return issues, {"blur_score": blur_score, "brightness": brightness, "green_ratio": green_ratio}


# -------------------------------------------------------------------
# STEP 3 — Lightweight enhancement
# -------------------------------------------------------------------
def enhance_photo(img_bgr):
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    img_bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    blurred = cv2.GaussianBlur(img_bgr, (0, 0), sigmaX=2)
    img_bgr = cv2.addWeighted(img_bgr, 1.3, blurred, -0.3, 0)

    img_bgr = cv2.fastNlMeansDenoisingColored(img_bgr, None, h=5, hColor=5,
                                               templateWindowSize=7, searchWindowSize=21)
    return img_bgr


# -------------------------------------------------------------------
# STEP 4 — Test-time augmentation prediction with YOUR model
# -------------------------------------------------------------------
def predict_with_tta(model, img_bgr, n_augments=5):
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img_rgb = cv2.resize(img_rgb, IMG_SIZE)
    base = img_rgb.astype(np.float32)

    variants = [base]
    rng = np.random.default_rng(42)
    for _ in range(n_augments - 1):
        v = base.copy()
        angle = rng.uniform(-15, 15)
        h, w = v.shape[:2]
        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        v = cv2.warpAffine(v, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        if rng.random() < 0.5:
            v = cv2.flip(v, 1)
        factor = rng.uniform(0.85, 1.15)
        v = np.clip(v * factor, 0, 255)
        variants.append(v)

    batch = np.stack(variants, axis=0)
    preds = model.predict(batch, verbose=0)
    return preds.mean(axis=0)


# -------------------------------------------------------------------
# STEP 5 — Kindwise crop.health API fallback (second opinion)
# -------------------------------------------------------------------
def predict_with_kindwise(image_path):
    """Calls Kindwise's crop.health API — a production model trained on
    real field photos. Used as a fallback when our own model isn't
    confident, or the input photo is flagged as low quality."""
    if KINDWISE_API_KEY == "your_api_key_here":
        return {"error": "Kindwise API key not configured. Set KINDWISE_API_KEY env var."}

    try:
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("ascii")

        response = requests.post(
            KINDWISE_ENDPOINT,
            params={"details": "taxonomy"},
            headers={"Api-Key": KINDWISE_API_KEY},
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
            "raw_crop_suggestions": crop_suggestions[:3],
            "raw_disease_suggestions": disease_suggestions[:3],
        }
    except requests.exceptions.RequestException as e:
        return {"error": f"Kindwise API call failed: {e}"}


# -------------------------------------------------------------------
# STEP 6 — Full pipeline for one uploaded photo
# -------------------------------------------------------------------
def predict_leaf(image_path, model, class_names, force_predict=False):
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        return {"error": f"Could not read image at {image_path}"}

    issues, metrics = check_photo_quality(img_bgr)

    if issues and not force_predict:
        return {
            "status": "quality_rejected",
            "issues": issues,
            "metrics": metrics,
            "message": "Photo quality too low for a reliable prediction. Please retake following the tips above.",
        }

    img_bgr = enhance_photo(img_bgr)
    avg_pred = predict_with_tta(model, img_bgr, n_augments=5)

    top3_idx = np.argsort(avg_pred)[::-1][:3]
    top3 = []
    for i in top3_idx:
        plant, disease, is_healthy = parse_class_name(class_names[i])
        top3.append({
            "plant": plant,
            "disease": disease,
            "is_healthy": is_healthy,
            "confidence": round(float(avg_pred[i]) * 100, 1),
        })

    result = {
        "status": "ok" if not issues else "predicted_with_warnings",
        "issues": issues,
        "metrics": metrics,
        "source": "own_model",
        "top_prediction": top3[0],
        "top3": top3,
    }

    # --- Fallback logic: low confidence -> ask Kindwise for a second opinion ---
    own_confidence = top3[0]["confidence"] / 100.0
    if own_confidence < CONFIDENCE_FALLBACK_THRESHOLD or issues:
        kindwise_result = predict_with_kindwise(image_path)
        result["fallback_triggered"] = True
        result["fallback_reason"] = (
            f"Own model confidence {own_confidence*100:.1f}% below threshold "
            f"{CONFIDENCE_FALLBACK_THRESHOLD*100:.0f}%" if own_confidence < CONFIDENCE_FALLBACK_THRESHOLD
            else "Photo quality issues detected"
        )
        result["kindwise_result"] = kindwise_result

        # If Kindwise succeeded and is notably more confident, promote it
        # to the primary answer shown to the user — but keep both for
        # transparency (and for your pitch: "here's our model vs a
        # production model, side by side").
        if "error" not in kindwise_result and kindwise_result["confidence"] > top3[0]["confidence"]:
            result["final_recommendation"] = kindwise_result
        else:
            result["final_recommendation"] = top3[0]
    else:
        result["fallback_triggered"] = False
        result["final_recommendation"] = top3[0]

    return result


# -------------------------------------------------------------------
# CLI entry point
# -------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python predict_leaf.py path/to/photo.jpg")
        sys.exit(1)

    image_path = sys.argv[1]
    model, class_names = load_assets()
    result = predict_leaf(image_path, model, class_names)

    print("\n=== Prediction Result ===")
    for k, v in result.items():
        print(f"{k}: {v}")