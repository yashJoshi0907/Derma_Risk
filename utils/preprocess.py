"""
utils/preprocess.py — Image preprocessing for SkinScan AI
Consistent with DenseNet121 training (Keras preprocess_input)
"""

import io
from typing import Tuple

import cv2
import numpy as np
from PIL import Image
from tensorflow.keras.applications.densenet import preprocess_input


def preprocess_image(
    image_bytes: bytes,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Preprocess raw image bytes for model inference.

    Parameters
    ----------
    image_bytes : raw bytes of any image file (jpg, png, etc.)

    Returns
    -------
    img_array : (1, 224, 224, 3) float32  — model input
    raw_224   : (224, 224, 3)    uint8 RGB — for Grad-CAM overlay
    rgb_full  : (H, W, 3)        uint8 RGB — original full-size image
    """
    # 1. Load
    pil_img  = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    rgb_full = np.array(pil_img, dtype=np.uint8)

    # 2. Center-square crop
    h, w  = rgb_full.shape[:2]
    crop  = min(h, w)
    top   = (h - crop) // 2
    left  = (w - crop) // 2
    cropped = rgb_full[top:top + crop, left:left + crop]

    # 3. Resize to 224x224
    raw_224 = cv2.resize(cropped, (224, 224), interpolation=cv2.INTER_AREA)

    # 4. DenseNet preprocessing (NOT /255.0)
    img_array = preprocess_input(raw_224.astype(np.float32))

    # 5. Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)

    return img_array, raw_224, rgb_full
