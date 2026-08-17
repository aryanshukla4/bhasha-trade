# Base image with CUDA + cuDNN pre-installed, matching TensorFlow 2.17's
# GPU requirements. Using the official TensorFlow GPU image is simpler
# than assembling CUDA/cuDNN by hand and avoids version-mismatch pain.
FROM tensorflow/tensorflow:2.17.0-gpu

WORKDIR /app

# System deps: opencv-python-headless still needs a couple of shared
# libraries at runtime even though it has no GUI components.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (separate layer -> cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the application code — NOT datasets or trained models.
# Those are mounted as volumes at runtime (see docker-compose.yml),
# since they're large, change independently of the code, and shouldn't
# bloat the image or require a rebuild every time you retrain.
COPY predict_leaf.py predict_server.py ./

EXPOSE 8000

CMD ["python", "predict_server.py"]
