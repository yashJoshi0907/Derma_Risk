"""
utils/preprocess.py — Image preprocessing for SkinScan AI
Handles center-crop, resize, normalization (ImageNet stats)
"""

import io
from typing import Tuple

import cv2
import numpy as np
from PIL import Image

# ImageNet normalization constants
_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess_image(
    image_bytes: bytes,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Preprocess raw image bytes for model inference.

    Returns
    -------
    img_array : np.ndarray, shape (1, 224, 224, 3), float32, normalized
    raw_224   : np.ndarray, shape (224, 224, 3), uint8 RGB
    rgb_full  : np.ndarray, shape (H, W, 3),     uint8 RGB (original resolution)
    """
    # 1. Read bytes → PIL → RGB numpy uint8
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    rgb_full = np.array(pil_img, dtype=np.uint8)

    h, w = rgb_full.shape[:2]

    # 3. Center-crop to square
    crop = min(h, w)
    top  = (h - crop) // 2
    left = (w - crop) // 2
    cropped = rgb_full[top : top + crop, left : left + crop]

    # 4. Resize to 224×224 with INTER_AREA (good for downscaling)
    raw_224 = cv2.resize(cropped, (224, 224), interpolation=cv2.INTER_AREA)

    # 5. float32 / 255
    img_array = raw_224.astype(np.float32) / 255.0

    # 6. ImageNet normalization
    img_array = (img_array - _MEAN) / _STD

    # 7. Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)  # (1, 224, 224, 3)

    return img_array, raw_224, rgb_full
