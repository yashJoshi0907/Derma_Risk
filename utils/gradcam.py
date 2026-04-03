"""
utils/gradcam.py — Grad-CAM for DenseNet121 (Keras 3 / nested Model)

Keras 3: tensors like nested.get_layer(...).output are not connected to the
outer model's inputs, so Model(model.inputs, [that, model.output]) fails.
We compose: G1(model.input) -> [conv_maps, pooled], then apply top-level
head layers on pooled so gradients flow to conv_maps.
"""

from typing import Dict, Optional

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model

# Last spatial concat in Keras DenseNet121 before global pooling
_DENSENET_CONV_TARGET = "conv5_block16_concat"

_gradcam_graph_cache: Dict[int, Model] = {}


def _find_densenet_wrapper(model: Model):
    """Return the nested tf.keras.Model that contains DenseNet conv5 concat."""
    for layer in model.layers:
        if isinstance(layer, tf.keras.Model):
            try:
                layer.get_layer(_DENSENET_CONV_TARGET)
                return layer
            except ValueError:
                continue
    return None


def _build_grad_model_densenet(model: Model) -> Model:
    dn = _find_densenet_wrapper(model)
    if dn is None:
        raise ValueError(
            f"No nested DenseNet with layer {_DENSENET_CONV_TARGET!r} found for Grad-CAM"
        )

    inner = dn.get_layer(_DENSENET_CONV_TARGET)
    G1 = Model(dn.input, [inner.output, dn.output])

    dn_name = dn.name
    dn_idx = None
    for i, layer in enumerate(model.layers):
        if layer.name == dn_name:
            dn_idx = i
            break
    if dn_idx is None:
        raise ValueError("DenseNet wrapper not found in model.layers by name")

    inp = model.input
    if isinstance(inp, list):
        inp = model.inputs[0]

    conv, pooled = G1(inp)
    x = pooled
    for layer in model.layers[dn_idx + 1 :]:
        x = layer(x)

    return Model(inp, [conv, x])


def _get_grad_model(model: Model) -> Model:
    key = id(model)
    if key not in _gradcam_graph_cache:
        _gradcam_graph_cache[key] = _build_grad_model_densenet(model)
    return _gradcam_graph_cache[key]


def make_gradcam_heatmap(
    model: Model,
    img_array: np.ndarray,
    pred_class_index: Optional[int] = None,
) -> np.ndarray:
    """
    Compute Grad-CAM heatmap using a single forward+backward pass.

    Parameters
    ----------
    model     : Full Keras model (input → softmax), DenseNet121-style head
    img_array : (1, 224, 224, 3) float32, preprocessed for the model
    pred_class_index : If set, explain this class logit; else argmax of softmax

    Returns
    -------
    heatmap : (224, 224) float32 in [0, 1]
    """
    grad_model = _get_grad_model(model)

    img_tensor = tf.cast(img_array, tf.float32)

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_tensor, training=False)
        n_cls = int(predictions.shape[-1])
        if pred_class_index is not None:
            ci = max(0, min(int(pred_class_index), n_cls - 1))
            top_score = predictions[:, ci]
        else:
            top_class = tf.argmax(predictions[0])
            top_score = predictions[:, top_class]

    grads = tape.gradient(top_score, conv_outputs)

    if grads is None:
        print("[GradCAM] WARNING: Gradients are None. Returning blank heatmap.")
        return np.zeros((224, 224), dtype=np.float32)

    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_out = conv_outputs[0].numpy()
    pooled = pooled_grads.numpy()

    for i in range(len(pooled)):
        conv_out[:, :, i] *= pooled[i]

    heatmap = np.mean(conv_out, axis=-1)
    heatmap = np.maximum(heatmap, 0)

    if heatmap.max() > 0:
        p2 = np.percentile(heatmap, 2)
        p98 = np.percentile(heatmap, 98)
        heatmap = np.clip(heatmap, p2, p98)
        denom = p98 - p2
        if denom > 0:
            heatmap = (heatmap - p2) / denom
        else:
            heatmap = heatmap / (heatmap.max() + 1e-8)

    heatmap = cv2.resize(heatmap, (224, 224), interpolation=cv2.INTER_CUBIC)
    heatmap = cv2.GaussianBlur(heatmap, (11, 11), 0)

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
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                cv2.putText(img, text, (x + dx, y + dy), font, scale,
                            (0, 0, 0), thickness + 1, cv2.LINE_AA)
        cv2.putText(img, text, (x, y), font, scale,
                    (255, 255, 255), thickness, cv2.LINE_AA)

    put_label(out, "Original", 8, h - 10)
    put_label(out, "Grad-CAM", 224 + 12, h - 10)

    return out
