"""
model_loader.py — Load pre-trained models from the models/ directory.
Never trains or downloads weights — only loads from disk.
"""

import os
import pickle

import joblib
import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import (
    BatchNormalization,
    Dense,
    Dropout,
    GlobalAveragePooling2D,
    Input,
)
from tensorflow.keras.applications import DenseNet121
from tensorflow.keras.models import Model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

MODEL_KERAS = os.path.join(MODELS_DIR, "cnn_model.keras")
MODEL_H5 = os.path.join(MODELS_DIR, "cnn_model.h5")
MODEL_WEIGHTS = os.path.join(MODELS_DIR, "densenet121_skin_classifier.h5")

CLASS_NAMES_PATH = os.path.join(MODELS_DIR, "class_names.pkl")

DEFAULT_CLASS_NAMES = ["nv", "mel", "bcc", "akiec", "bkl", "df", "vasc"]


def _load_sklearn_artifact(path: str):
    """
    Load sklearn-style objects saved as pickle or joblib.
    Training code often uses joblib.dump(..., 'file.pkl'); pickle.load then fails
    with errors like 'invalid load key' (e.g. first byte 0x09).
    """
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception as pickle_err:
        try:
            return joblib.load(path)
        except Exception as joblib_err:
            raise RuntimeError(
                f"Could not load {path!r} as pickle ({pickle_err}) or joblib ({joblib_err}). "
                "Use a real .pkl/.joblib from sklearn (not CSV/Excel/text), and match sklearn version if needed."
            ) from joblib_err


# ---------------------------------------------------------------------------
# Build DenseNet121 architecture
# ---------------------------------------------------------------------------
def _build_densenet_model() -> Model:
    inputs = Input(shape=(224, 224, 3))
    base = DenseNet121(include_top=False, weights=None, pooling="avg")(inputs)
    x = BatchNormalization()(base)
    x = Dense(256, activation="relu")(x)
    x = Dropout(0.4)(x)
    outputs = Dense(7, activation="softmax")(x)
    return Model(inputs, outputs)


# ---------------------------------------------------------------------------
# Load CNN model
# ---------------------------------------------------------------------------
def _load_cnn_model() -> Model:
    if os.path.exists(MODEL_KERAS):
        print(f"[ModelLoader] Loading CNN from {MODEL_KERAS}")
        return tf.keras.models.load_model(MODEL_KERAS)

    if os.path.exists(MODEL_H5):
        print(f"[ModelLoader] Loading CNN from {MODEL_H5}")
        return tf.keras.models.load_model(MODEL_H5)

    print(f"[ModelLoader] Building DenseNet121 and loading weights from {MODEL_WEIGHTS}")
    m = _build_densenet_model()
    m.load_weights(MODEL_WEIGHTS)
    return m


# ---------------------------------------------------------------------------
# Load all models at module import time
# ---------------------------------------------------------------------------
print("[ModelLoader] Loading CNN backbone (keras → h5 → densenet121_skin_classifier weights) …")
backbone_model: Model = _load_cnn_model()

# CNN-only pipeline: always prefer densenet121_skin_classifier.h5 for softmax when present.
# If there is no separate keras/h5, backbone already is DenseNet + those weights — reuse it.
if os.path.exists(MODEL_WEIGHTS) and (
    os.path.exists(MODEL_KERAS) or os.path.exists(MODEL_H5)
):
    print(f"[ModelLoader] CNN-only softmax: DenseNet + {MODEL_WEIGHTS} (prioritized over saved keras/h5)")
    cnn_only_model = _build_densenet_model()
    cnn_only_model.load_weights(MODEL_WEIGHTS)
else:
    cnn_only_model = backbone_model

# Warm up
print("[ModelLoader] Warming up backbone CNN …")
_ = backbone_model.predict(tf.zeros((1, 224, 224, 3)), verbose=0)
if cnn_only_model is not backbone_model:
    print("[ModelLoader] Warming up CNN-only DenseNet …")
    _ = cnn_only_model.predict(tf.zeros((1, 224, 224, 3)), verbose=0)
print("[ModelLoader] CNN ready.")

# Class labels for DenseNet softmax; optional class_names.pkl
CLASS_NAMES = DEFAULT_CLASS_NAMES
if os.path.exists(CLASS_NAMES_PATH):
    try:
        CLASS_NAMES = _load_sklearn_artifact(CLASS_NAMES_PATH)
        print(f"[ModelLoader] Loaded class names from {CLASS_NAMES_PATH}")
    except Exception as e:
        print(f"[ModelLoader] WARNING: Could not load {CLASS_NAMES_PATH}: {e}. Using defaults.")

# `model`: legacy alias. predict.py uses `cnn_only_model` for Grad-CAM/LIME (DenseNet + weights path).
model: Model = cnn_only_model


# ---------------------------------------------------------------------------
# Predict function
# ---------------------------------------------------------------------------
def predict_hybrid_batch(
    img_array: np.ndarray,
    age: float = 55.0,
    sex: str = "unknown",
    location: str = "unknown",
):
    """
    CNN-only: softmax from `cnn_only_model` (DenseNet121 + densenet121_skin_classifier.h5
    when that file exists alongside keras/h5 backbone; otherwise the loaded backbone).

    age/sex/location are ignored for the class (API compatibility only).

    Returns (label: str, confidence: float, class_idx: int)
    img_array shape: (1, 224, 224, 3), float32, already normalized
    """
    preds = cnn_only_model.predict(img_array, verbose=0)
    idx = int(np.argmax(preds[0]))
    conf = float(preds[0][idx])
    label = CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else str(idx)
    return label, conf, idx
