"""
model_loader.py — Load pre-trained models from the models/ directory.
Never trains or downloads weights — only loads from disk.
"""

import os
import pickle

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

FEATURE_EXTRACTOR_PATH = os.path.join(MODELS_DIR, "feature_extractor.keras")
HYBRID_MODEL_PATH = os.path.join(MODELS_DIR, "hybrid_model.pkl")
META_SCALER_PATH = os.path.join(MODELS_DIR, "meta_scaler.pkl")
SEX_ENCODER_PATH = os.path.join(MODELS_DIR, "sex_encoder.pkl")
LOC_ENCODER_PATH = os.path.join(MODELS_DIR, "loc_encoder.pkl")
CLASS_NAMES_PATH = os.path.join(MODELS_DIR, "class_names.pkl")

DEFAULT_CLASS_NAMES = ["nv", "mel", "bcc", "akiec", "bkl", "df", "vasc"]

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
# Build feature extractor (inputs → penultimate layer)
# ---------------------------------------------------------------------------
def _build_feature_extractor(cnn: Model) -> Model:
    if os.path.exists(FEATURE_EXTRACTOR_PATH):
        print(f"[ModelLoader] Loading feature_extractor from {FEATURE_EXTRACTOR_PATH}")
        return tf.keras.models.load_model(FEATURE_EXTRACTOR_PATH)

    # Second-to-last layer output (before softmax)
    penultimate_layer = cnn.layers[-2]
    return Model(inputs=cnn.inputs, outputs=penultimate_layer.output)


# ---------------------------------------------------------------------------
# Safe label encoding
# ---------------------------------------------------------------------------
def _safe_label_encode(encoder, value: str) -> int:
    """Encode a categorical value safely; never raises an exception."""
    try:
        classes = [c.lower() for c in encoder.classes_]
        val_lower = str(value).lower()
        if val_lower in classes:
            return classes.index(val_lower)
        if "unknown" in classes:
            return classes.index("unknown")
        return 0
    except Exception:
        return 0


# ---------------------------------------------------------------------------
# Load all models at module import time
# ---------------------------------------------------------------------------
print("[ModelLoader] Loading CNN model …")
model: Model = _load_cnn_model()

# Warm up
print("[ModelLoader] Warming up CNN …")
_ = model.predict(tf.zeros((1, 224, 224, 3)), verbose=0)
print("[ModelLoader] CNN ready.")

print("[ModelLoader] Building feature extractor …")
feature_extractor: Model = _build_feature_extractor(model)

# ---------------------------------------------------------------------------
# Hybrid pipeline
# ---------------------------------------------------------------------------
HYBRID_READY = False
clf = None
meta_scaler = None
sex_encoder = None
loc_encoder = None
CLASS_NAMES = DEFAULT_CLASS_NAMES

_pkl_files = [HYBRID_MODEL_PATH, META_SCALER_PATH, SEX_ENCODER_PATH, LOC_ENCODER_PATH]
if all(os.path.exists(p) for p in _pkl_files):
    try:
        with open(HYBRID_MODEL_PATH, "rb") as f:
            clf = pickle.load(f)
        with open(META_SCALER_PATH, "rb") as f:
            meta_scaler = pickle.load(f)
        with open(SEX_ENCODER_PATH, "rb") as f:
            sex_encoder = pickle.load(f)
        with open(LOC_ENCODER_PATH, "rb") as f:
            loc_encoder = pickle.load(f)

        if os.path.exists(CLASS_NAMES_PATH):
            with open(CLASS_NAMES_PATH, "rb") as f:
                CLASS_NAMES = pickle.load(f)

        HYBRID_READY = True
        print("[ModelLoader] Hybrid pipeline loaded successfully.")
    except Exception as e:
        print(f"[ModelLoader] WARNING: Hybrid pipeline load failed: {e}. Falling back to CNN only.")
        HYBRID_READY = False
else:
    missing = [p for p in _pkl_files if not os.path.exists(p)]
    print(f"[ModelLoader] Hybrid pkl files missing: {missing}. Using CNN-only mode.")


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
    Returns (label: str, confidence: float, class_idx: int)
    img_array shape: (1, 224, 224, 3), float32, already normalized
    """
    if not HYBRID_READY:
        preds = model.predict(img_array, verbose=0)
        idx = int(np.argmax(preds[0]))
        conf = float(preds[0][idx])
        label = CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else str(idx)
        return label, conf, idx

    # Feature extraction
    feat = feature_extractor.predict(img_array, verbose=0)  # (1, N)

    # Encode metadata
    sex_i = _safe_label_encode(sex_encoder, sex)
    loc_i = _safe_label_encode(loc_encoder, location)

    # Scale metadata
    meta_raw = np.array([[float(age), float(sex_i), float(loc_i)]])
    meta_scaled = meta_scaler.transform(meta_raw)

    # Concatenate features
    X = np.concatenate([feat[0], meta_scaled[0]], axis=0).reshape(1, -1)

    # Predict
    proba = clf.predict_proba(X)[0]
    idx = int(np.argmax(proba))
    conf = float(proba[idx])
    label = CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else str(idx)
    return label, conf, idx
