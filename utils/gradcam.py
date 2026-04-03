"""
utils/gradcam.py — Robust Grad-CAM visualization.
Uses a single GradientTape approach on the full model instead of
splitting into sub-models (which breaks on DenseNet skip connections).
"""

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model


def _find_last_conv_layer(model: Model):
    """Walk the model (and any nested sub-models) to find the last Conv2D layer."""
    last_conv = None
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model):
            for sub_layer in layer.layers:
                if isinstance(sub_layer, tf.keras.layers.Conv2D):
                    last_conv = sub_layer
        elif isinstance(layer, tf.keras.layers.Conv2D):
            last_conv = layer
    return last_conv


def _find_target_layer(model: Model):
    """
    Find the target conv layer AND the sub-model it lives in.
    Returns (sub_model, layer_name) so we can build a proper gradient model.
    """
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model):
            # DenseNet121 is a nested sub-model
            for sub_layer in reversed(layer.layers):
                if isinstance(sub_layer, tf.keras.layers.Conv2D):
                    return layer, sub_layer.name
    # Fallback: look in the top-level model
    for layer in reversed(model.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            return model, layer.name
    return None, None


def make_gradcam_heatmap(model: Model, img_array: np.ndarray) -> np.ndarray:
    """
    Compute Grad-CAM heatmap using a single forward+backward pass.

    Parameters
    ----------
    model     : Full Keras model (input → softmax)
    img_array : (1, 224, 224, 3) float32, preprocessed for the model

    Returns
    -------
    heatmap : (224, 224) float32 in [0, 1]
    """
    sub_model, target_layer_name = _find_target_layer(model)
    if sub_model is None:
        raise ValueError("No Conv2D layer found in model")

    # Build a model that outputs both the conv layer activations and predictions
    grad_model = Model(
        inputs=model.inputs,
        outputs=[
            sub_model.get_layer(target_layer_name).output,
            model.output,
        ],
    )

    img_tensor = tf.cast(img_array, tf.float32)

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_tensor, training=False)
        top_class = tf.argmax(predictions[0])
        top_score = predictions[:, top_class]

    # Gradient of the top class score w.r.t. the conv outputs
    grads = tape.gradient(top_score, conv_outputs)

    if grads is None:
        print("[GradCAM] WARNING: Gradients are None. Returning blank heatmap.")
        return np.zeros((224, 224), dtype=np.float32)

    # Global average pooling of gradients
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # Weight the conv output channels by pooled gradients
    conv_out = conv_outputs[0].numpy()
    pooled = pooled_grads.numpy()

    for i in range(len(pooled)):
        conv_out[:, :, i] *= pooled[i]

    # Average across channels → heatmap
    heatmap = np.mean(conv_out, axis=-1)

    # ReLU
    heatmap = np.maximum(heatmap, 0)

    # Percentile-based clipping for better contrast
    if heatmap.max() > 0:
        p2 = np.percentile(heatmap, 2)
        p98 = np.percentile(heatmap, 98)
        heatmap = np.clip(heatmap, p2, p98)
        denom = p98 - p2
        if denom > 0:
            heatmap = (heatmap - p2) / denom
        else:
            heatmap = heatmap / (heatmap.max() + 1e-8)

    # Upsample to 224×224 with cubic interpolation
    heatmap = cv2.resize(heatmap, (224, 224), interpolation=cv2.INTER_CUBIC)

    # Gaussian blur for smoothness
    heatmap = cv2.GaussianBlur(heatmap, (11, 11), 0)

    # Final normalization
    if heatmap.max() > 0:
        heatmap = heatmap / heatmap.max()

    return heatmap.astype(np.float32)


def overlay_gradcam(
    img_rgb_224: np.ndarray,
    heatmap: np.ndarray,
    alpha: float = 0.55,
) -> np.ndarray:
    """
    Overlay the heatmap onto the image using COLORMAP_TURBO.

    Parameters
    ----------
    img_rgb_224 : (224, 224, 3) uint8 RGB
    heatmap     : (224, 224) float32 in [0, 1]
    alpha       : blend strength of the heatmap

    Returns
    -------
    result : (224, 224, 3) uint8 RGB
    """
    heatmap_uint8 = np.uint8(255 * heatmap)
    colored_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_TURBO)
    colored_heatmap_rgb = cv2.cvtColor(colored_heatmap, cv2.COLOR_BGR2RGB)

    # Blend: heatmap on top
    blended = cv2.addWeighted(colored_heatmap_rgb, alpha, img_rgb_224, 1 - alpha, 0)
    return blended  # RGB uint8


def make_comparison_image(
    original_rgb: np.ndarray,
    gradcam_rgb: np.ndarray,
) -> np.ndarray:
    """
    Stack original and Grad-CAM side-by-side with a separator and labels.
    Returns RGB uint8.
    """
    h = 224
    orig = cv2.resize(original_rgb, (224, h), interpolation=cv2.INTER_AREA)
    gcam = cv2.resize(gradcam_rgb, (224, h), interpolation=cv2.INTER_AREA)

    separator = np.full((h, 4, 3), 255, dtype=np.uint8)
    out = np.concatenate([orig, separator, gcam], axis=1)

    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.5
    thickness = 1

    def put_label(img, text, x, y):
        # Dark outline for readability
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                cv2.putText(img, text, (x + dx, y + dy), font, scale,
                            (0, 0, 0), thickness + 1, cv2.LINE_AA)
        cv2.putText(img, text, (x, y), font, scale,
                    (255, 255, 255), thickness, cv2.LINE_AA)

    put_label(out, "Original", 8, h - 10)
    put_label(out, "Grad-CAM", 224 + 12, h - 10)

    return out
