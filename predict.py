"""
predict.py — Full prediction pipeline for SkinScan AI
Wraps preprocessing, model inference, Grad-CAM, and LIME.
"""

import numpy as np

from model_loader import cnn_only_model, HYBRID_READY, predict_hybrid_batch
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

    # ── 2. Defaults (must match what hybrid encoders + meta_scaler expect) ─
    age_used = float(age) if age is not None else 55.0
    sex_used = str(sex).strip().lower() if sex is not None else "unknown"
    location_used = str(location).strip().lower() if location is not None else "unknown"

    # ── 3. Hybrid: CNN features → sex/loc encoding → meta_scaler → hybrid clf
    label, confidence, class_idx = predict_hybrid_batch(
        img_array, age_used, sex_used, location_used
    )
    mode = "hybrid" if HYBRID_READY else "cnn_only"

    # ── 4. Grad-CAM / LIME — always cnn_only_model (DenseNet + densenet121 weights when set);
    #        same graph as preprocess.py / terminal tests. Hybrid label still from step 3.
    try:
        heatmap = make_gradcam_heatmap(
            cnn_only_model, img_array, pred_class_index=class_idx
        )
        
        # overlay_gradcam takes RGB uint8 and returns RGB uint8
        gradcam_rgb = overlay_gradcam(raw_224, heatmap, alpha=0.55)
        
        comparison = make_comparison_image(raw_224, gradcam_rgb)

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
