"""
predict.py — Full prediction pipeline for SkinScan AI
Wraps preprocessing, model inference, Grad-CAM, and LIME.
"""

import cv2
import numpy as np

from model_loader import model, HYBRID_READY, predict_hybrid_batch
from utils.preprocess import preprocess_image
from utils.gradcam import (
    make_gradcam_heatmap,
    overlay_gradcam,
    make_comparison_image,
)
from utils.lime_explainer import explain_lime


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
    img_array, raw_224, rgb_full = preprocess_image(image_bytes)

    # ── 2. Defaults ────────────────────────────────────────────────────────
    age      = float(age)      if age      is not None else 55.0
    sex      = str(sex)        if sex      is not None else "unknown"
    location = str(location)   if location is not None else "unknown"

    # ── 3. Hybrid / CNN prediction ─────────────────────────────────────────
    label, confidence, class_idx = predict_hybrid_batch(
        img_array, age, sex, location
    )
    mode = "hybrid" if HYBRID_READY else "cnn_only"

    # ── 4. Grad-CAM ────────────────────────────────────────────────────────
    try:
        # img_array is (1, 224, 224, 3) float32, preprocessed
        heatmap = make_gradcam_heatmap(model, img_array)
        
        # overlay_gradcam takes RGB uint8 and returns RGB uint8
        gradcam_rgb = overlay_gradcam(raw_224, heatmap, alpha=0.55)
        
        comparison = make_comparison_image(raw_224, gradcam_rgb)

    except Exception as e:
        print(f"[Predict] Grad-CAM failed: {e}. Using raw_224 as fallback.")
        comparison = raw_224.copy()

    # ── 5. LIME ────────────────────────────────────────────────────────────
    try:
        lime_img = explain_lime(model, raw_224)
    except Exception as e:
        print(f"[Predict] LIME failed: {e}. Using raw_224 as fallback.")
        lime_img = raw_224.copy()

    # ── 6. Return ──────────────────────────────────────────────────────────
    return {
        "label":          label,
        "confidence":     confidence,
        "gradcam":        comparison,    # numpy RGB uint8
        "lime":           lime_img,      # numpy RGB uint8
        "mode":           mode,
        "original_image": raw_224,       # numpy RGB uint8
    }
