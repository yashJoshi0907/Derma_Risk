"""
test_gradcam.py — Self-contained Grad-CAM test script
Change IMAGE_PATH and MODEL_PATH below, then run: python test_gradcam.py
"""

import cv2
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from tensorflow.keras.applications.densenet import preprocess_input

# ══════════════════════════════════════════════════════════════════════════════
#  CONFIG — change these two paths
# ══════════════════════════════════════════════════════════════════════════════

IMAGE_PATH = r"C:\Users\devgo\OneDrive\Desktop\Hacksagon models\processed_images\VASC\ISIC_0032270.jpg"
MODEL_PATH = r"C:\Users\devgo\OneDrive\Desktop\Hacksagon models\model\densenet121_skin_classifier.h5"

CLASS_NAMES = ["AKIEC", "BCC", "BKL", "DF", "MEL", "NV", "VASC"]
HIGH_RISK   = {"MEL", "BCC", "AKIEC"}
MEDIUM_RISK = {"BKL", "DF"}

# ══════════════════════════════════════════════════════════════════════════════
#  1. MODEL LOADER
# ══════════════════════════════════════════════════════════════════════════════

def load_model(model_path: str) -> tf.keras.Model:
    tf.keras.backend.clear_session()

    base = tf.keras.applications.DenseNet121(
        include_top=False,
        weights=None,
        input_shape=(224, 224, 3),
        pooling="avg",
    )

    model = tf.keras.Sequential([
        tf.keras.Input(shape=(224, 224, 3)),
        base,
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dense(256, activation="relu"),
        tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(7, activation="softmax"),
    ])

    model.load_weights(model_path)
    _ = model(tf.zeros((1, 224, 224, 3)))  # build
    print("✅ Model loaded")
    print("   Layers:")
    for i, l in enumerate(model.layers):
        print(f"     [{i}] {l.name}  ({type(l).__name__})")
    return model


# ══════════════════════════════════════════════════════════════════════════════
#  2. PREPROCESS
# ══════════════════════════════════════════════════════════════════════════════

def preprocess_image(image_path: str):
    """
    Returns
    -------
    img_array : (1, 224, 224, 3) float32 — model input
    raw_224   : (224, 224, 3)    uint8 RGB — for overlay
    """
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Center-square crop
    h, w  = img.shape[:2]
    crop  = min(h, w)
    top   = (h - crop) // 2
    left  = (w - crop) // 2
    img   = img[top:top + crop, left:left + crop]

    # Resize
    raw_224   = cv2.resize(img, (224, 224), interpolation=cv2.INTER_AREA)

    # DenseNet preprocessing (NOT /255.0)
    img_array = preprocess_input(raw_224.astype(np.float32))
    img_array = np.expand_dims(img_array, axis=0)

    print("✅ Image preprocessed")
    print(f"   img_array : {img_array.shape}  {img_array.dtype}")
    print(f"   raw_224   : {raw_224.shape}  {raw_224.dtype}")
    return img_array, raw_224


# ══════════════════════════════════════════════════════════════════════════════
#  3. GRAD-CAM
# ══════════════════════════════════════════════════════════════════════════════

def build_gradcam_models(model: tf.keras.Model):
    """
    Split model into conv_model + classifier_model.
    Layer order (Input not counted):
      [0] densenet121, [1] BN, [2] Dense256, [3] Dropout, [4] Dense7
    """
    base_model      = model.layers[0]
    last_conv_layer = base_model.get_layer("conv5_block16_concat")

    conv_model = tf.keras.Model(
        inputs=base_model.input,
        outputs=last_conv_layer.output,
    )

    classifier_input = tf.keras.Input(shape=last_conv_layer.output.shape[1:])
    x      = classifier_input
    x      = tf.keras.layers.GlobalAveragePooling2D()(x)
    x      = model.layers[1](x)   # BatchNormalization
    x      = model.layers[2](x)   # Dense(256, relu)
    x      = model.layers[3](x)   # Dropout
    output = model.layers[4](x)   # Dense(7, softmax)
    classifier_model = tf.keras.Model(classifier_input, output)

    print("✅ Grad-CAM split models ready")
    print(f"   conv_model output       : {conv_model.output_shape}")
    print(f"   classifier_model output : {classifier_model.output_shape}")
    return conv_model, classifier_model


def make_gradcam_heatmap(conv_model, classifier_model, img_array):
    """
    Returns
    -------
    heatmap    : (224, 224) float32 in [0, 1]
    pred_index : int
    predictions: tensor — full softmax output
    """
    with tf.GradientTape() as tape:
        conv_outputs  = conv_model(img_array, training=False)
        tape.watch(conv_outputs)
        predictions   = classifier_model(conv_outputs, training=False)
        pred_index    = tf.argmax(predictions[0])
        class_channel = predictions[:, pred_index]

    grads        = tape.gradient(class_channel, conv_outputs)
    if grads is None:
        return np.zeros((224, 224), dtype=np.float32), int(pred_index.numpy()), predictions

    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    heatmap = conv_outputs[0] @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0)
    heatmap = heatmap / (tf.reduce_max(heatmap) + 1e-8)
    heatmap = heatmap.numpy()
    heatmap = cv2.GaussianBlur(heatmap, (15, 15), 0)
    heatmap = cv2.resize(heatmap, (224, 224), interpolation=cv2.INTER_CUBIC)

    return heatmap.astype(np.float32), int(pred_index.numpy()), predictions


def overlay_gradcam(raw_224: np.ndarray, heatmap: np.ndarray, alpha: float = 0.6) -> np.ndarray:
    img_bgr       = cv2.cvtColor(raw_224, cv2.COLOR_RGB2BGR)
    heatmap_uint8 = np.uint8(255 * heatmap)
    colored       = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    superimposed  = colored * alpha + img_bgr
    return cv2.cvtColor(np.uint8(superimposed), cv2.COLOR_BGR2RGB)


# ══════════════════════════════════════════════════════════════════════════════
#  4. PLOT
# ══════════════════════════════════════════════════════════════════════════════

def plot_results(raw_224, heatmap, overlay_rgb, pred_class, confidence, risk, predictions):
    fig = plt.figure(figsize=(16, 6))
    fig.suptitle(
        f"Predicted: {pred_class}   |   Confidence: {confidence:.2%}   |   Risk: {risk}",
        fontsize=14, fontweight="bold"
    )

    # --- image panels ---
    ax1 = fig.add_subplot(1, 4, 1)
    ax1.imshow(raw_224)
    ax1.set_title("Original")
    ax1.axis("off")

    ax2 = fig.add_subplot(1, 4, 2)
    ax2.imshow(heatmap, cmap="jet")
    ax2.set_title("Heatmap")
    ax2.axis("off")

    ax3 = fig.add_subplot(1, 4, 3)
    ax3.imshow(overlay_rgb)
    ax3.set_title("Grad-CAM Overlay")
    ax3.axis("off")

    # --- probability bar chart ---
    ax4 = fig.add_subplot(1, 4, 4)
    probs  = predictions[0].numpy()
    colors = [
        "#e74c3c" if CLASS_NAMES[i] in HIGH_RISK else
        "#f39c12" if CLASS_NAMES[i] in MEDIUM_RISK else
        "#2ecc71"
        for i in range(len(CLASS_NAMES))
    ]
    bars = ax4.barh(CLASS_NAMES, probs, color=colors)
    ax4.set_xlim(0, 1)
    ax4.set_xlabel("Probability")
    ax4.set_title("Class Probabilities")
    for bar, prob in zip(bars, probs):
        ax4.text(min(prob + 0.02, 0.95), bar.get_y() + bar.get_height() / 2,
                 f"{prob:.3f}", va="center", fontsize=8)

    # legend
    from matplotlib.patches import Patch
    ax4.legend(handles=[
        Patch(color="#e74c3c", label="High risk"),
        Patch(color="#f39c12", label="Medium risk"),
        Patch(color="#2ecc71", label="Low risk"),
    ], fontsize=8, loc="lower right")

    plt.tight_layout()
    plt.savefig("gradcam_result.png", dpi=150, bbox_inches="tight")
    print("✅ Saved → gradcam_result.png")
    plt.show()


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 1. Load model
    model = load_model(MODEL_PATH)

    # 2. Preprocess
    img_array, raw_224 = preprocess_image(IMAGE_PATH)

    # 3. Build Grad-CAM models
    conv_model, classifier_model = build_gradcam_models(model)

    # 4. Run Grad-CAM
    heatmap, pred_idx, predictions = make_gradcam_heatmap(conv_model, classifier_model, img_array)

    pred_class = CLASS_NAMES[pred_idx]
    confidence = float(predictions[0][pred_idx].numpy())
    risk       = ("HIGH"   if pred_class in HIGH_RISK   else
                  "MEDIUM" if pred_class in MEDIUM_RISK else "LOW")

    print(f"\n  Predicted : {pred_class}")
    print(f"  Confidence: {confidence:.2%}")
    print(f"  Risk      : {risk}")
    print("\n  All class probabilities:")
    for name, prob in zip(CLASS_NAMES, predictions[0].numpy()):
        bar = "█" * int(prob * 30)
        print(f"   {name:6s} {prob:.4f}  {bar}")

    # 5. Overlay + plot
    overlay = overlay_gradcam(raw_224, heatmap)
    plot_results(raw_224, heatmap, overlay, pred_class, confidence, risk, predictions)
