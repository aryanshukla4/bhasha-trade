"""
predict_server.py
==================
Turns predict_leaf.py into an API your website can call.

Setup:
    pip install fastapi uvicorn python-multipart opencv-python requests --break-system-packages
    export KINDWISE_API_KEY="your_actual_key"   # get one free at admin.kindwise.com
    python predict_server.py

Then it listens at http://localhost:8000/predict
"""

import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from predict_leaf import load_assets, predict_leaf

app = FastAPI(title="Bhasha Trade — Crop Disease Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to your actual frontend URL before going live
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading model...")
model, class_names = load_assets()
print(f"Model loaded. {len(class_names)} classes ready.")


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        return {"status": "error", "message": "Could not read uploaded image — is it a valid photo file?"}

    temp_path = "/tmp/_upload_temp.jpg"
    cv2.imwrite(temp_path, img_bgr)

    result = predict_leaf(temp_path, model, class_names)
    return result


@app.get("/health")
async def health():
    return {"status": "ok", "classes_loaded": len(class_names)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)