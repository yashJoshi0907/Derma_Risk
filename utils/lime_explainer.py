"""
utils/lime_explainer.py — LIME image explanation for SkinScan AI.
Uses green overlay for positive contributions, red for negative,
with hide_rest=True for a clear visual explanation.
"""

import numpy as np
from lime import lime_image
from skimage.segmentation import mark_boundaries
from tensorflow.keras.models import Model

# ImageNet normalization constants
_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def explain_lime(model: Model, raw_224: np.ndarray) -> np.ndarray:
    """
    Generate a LIME explanation for the given 224x224 uint8 RGB image.

    Returns
    -------
    np.ndarray shape (224, 224, 3) uint8 RGB — the visualized explanation
    """

    def classifier_fn(images: np.ndarray) -> np.ndarray:
        """LIME calls this with a batch of perturbed uint8 images."""
        arr = images.astype(np.float32) / 255.0
        arr = (arr - _MEAN) / _STD
        return model.predict(arr, verbose=0)

    try:
        explainer = lime_image.LimeImageExplainer()

        explanation = explainer.explain_instance(
            raw_224,
            classifier_fn,
            top_labels=1,
            hide_color=0,
            num_samples=100,
            random_seed=42,
        )

        top_label = explanation.top_labels[0]

        # ── Method 1: Highlighted positive regions on dark background ──
        temp_pos, mask_pos = explanation.get_image_and_mask(
            top_label,
            positive_only=True,
            num_features=5,
            hide_rest=True,     # Black out non-important regions
        )

        # ── Method 2: Boundary-marked regions on original image ──
        temp_both, mask_both = explanation.get_image_and_mask(
            top_label,
            positive_only=False,
            num_features=10,
            hide_rest=False,
            min_weight=0.01,
        )

        # Mark segment boundaries in green on the original image
        bounded = mark_boundaries(
            raw_224.astype(np.float64) / 255.0,
            mask_both,
            color=(0, 1, 0),  # green boundaries
            mode="thick",
        )
        bounded = (bounded * 255).astype(np.uint8)

        # Combine: blend positive-only (50%) with bounded original (50%)
        # This shows which regions matter AND where they are in context
        pos_enhanced = temp_pos.copy().astype(np.float32)

        # Brighten the positive regions for visibility
        bright_mask = mask_pos > 0
        if bright_mask.any():
            # Tint positive regions with a green hue
            green_overlay = np.zeros_like(pos_enhanced)
            green_overlay[:, :, 1] = 180  # green channel
            pos_enhanced[bright_mask] = (
                pos_enhanced[bright_mask] * 0.6 +
                green_overlay[bright_mask] * 0.4
            )

        # Black regions from hide_rest=True get replaced with dim original
        dark_mask = mask_pos == 0
        dim_original = raw_224.astype(np.float32) * 0.2  # very dim
        pos_enhanced[dark_mask] = dim_original[dark_mask]

        result = np.clip(pos_enhanced, 0, 255).astype(np.uint8)

        # Draw green boundaries on final result for segment visibility
        result_float = result.astype(np.float64) / 255.0
        result = mark_boundaries(
            result_float,
            mask_both,
            color=(0, 1, 0),
            mode="thick",
        )
        result = (result * 255).astype(np.uint8)

        return result

    except Exception as e:
        print(f"[LIME] Warning: explanation failed — {e}. Returning original image.")
        return raw_224.copy()
