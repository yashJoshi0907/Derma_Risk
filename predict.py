"""
predict.py — Full prediction pipeline for SkinScan AI
Wraps preprocessing, model inference, Grad-CAM, and LIME.
"""

import io

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras.applications.densenet import preprocess_input

from model_loader import MODEL_WEIGHTS, cnn_only_model, predict_hybrid_batch
from utils import test_gradcam2 as _tg2
from utils.preprocess import preprocess_image
from utils.lime_explainer import explain_lime

_tg2_conv = None
_tg2_classifier = None


def _bytes_to_gradcam2_tensors(image_bytes: bytes):
    """Same crop/resize as utils/test_gradcam2.preprocess_image, from upload bytes."""
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    rgb = np.asarray(pil_img, dtype=np.uint8)
    cr = _tg2.crop_center(rgb, size=180)
    raw_224 = cv2.resize(cr, (224, 224))
    img_arr = np.expand_dims(preprocess_input(raw_224.astype(np.float32)), axis=0)
    return img_arr, raw_224


def _gradcam2_graphs():
    global _tg2_conv, _tg2_classifier
    if _tg2_conv is None:
        _real_clear = tf.keras.backend.clear_session
        tf.keras.backend.clear_session = lambda: None
        try:
            full = _tg2.load_model(MODEL_WEIGHTS)
        finally:
            tf.keras.backend.clear_session = _real_clear
        _tg2_conv, _tg2_classifier = _tg2.build_gradcam_models(full)
    return _tg2_conv, _tg2_classifier


def predict(
    image_bytes: bytes,
    age: float = None,
    sex: str = None,
    location: str = None,
) -> dict:
    """
    Run full prediction pipeline.
    """
    # ── 1. Preprocess ──────────────────────────────────────────────────────
    img_array, raw_224, _rgb_full = preprocess_image(image_bytes)

    # ── 2. Defaults (stored with prediction; class is from CNN image-only) ─
    age_used = float(age) if age is not None else 55.0
    sex_used = str(sex).strip().lower() if sex is not None else "unknown"
    location_used = str(location).strip().lower() if location is not None else "unknown"

    # ── 3. CNN-only: DenseNet softmax via cnn_only_model ─
    label, confidence, class_idx = predict_hybrid_batch(
        img_array, age_used, sex_used, location_used
    )
    mode = "cnn_only"

    # ── 4. Grad-CAM (utils/test_gradcam2) — 180px center crop + split model
    try:
        g2_arr, g2_raw = _bytes_to_gradcam2_tensors(image_bytes)
        conv_m, clf_m = _gradcam2_graphs()
        heatmap, _, _ = _tg2.make_gradcam(conv_m, clf_m, g2_arr)
        comparison = _tg2.gradcam_result_image(g2_raw, heatmap, alpha=0.6)

    except Exception as e:
        print(f"[Predict] Grad-CAM failed: {e}. Using raw_224 as fallback.")
        comparison = raw_224.copy()

    # ── 5. LIME ────────────────────────────────────────────────────────────
    try:
        lime_img = explain_lime(cnn_only_model, raw_224)
    except Exception as e:
        print(f"[Predict] LIME failed: {e}. Using raw_224 as fallback.")
        lime_img = raw_224.copy()

    # ── 6. Return ──────────────────────────────────────────────────────────
    return {
        "label":          label,
        "confidence":     confidence,
        "class_idx":      class_idx,
        "gradcam":        comparison,    # numpy RGB uint8
        "lime":           lime_img,      # numpy RGB uint8
        "mode":           mode,
        "original_image": raw_224,       # numpy RGB uint8
        "metadata_used": {
            "age": age_used,
            "sex": sex_used,
            "location": location_used,
        },
    }
