# %%
import os
import numpy as np
import cv2
import tensorflow as tf
import pandas as pd

BASE_DIR = r"C:\Users\devgo\OneDrive\Desktop\Hacksagon models"

IMAGE_DIR = os.path.join(BASE_DIR, "processed_images")
METADATA_PATH = os.path.join(BASE_DIR, "HAM10000_metadata.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model", "densenet121_skin_classifier.h5")

# Rebuild architecture and load weights (legacy .h5 does not load with load_model on newer Keras)
tf.keras.backend.clear_session()
base = tf.keras.applications.DenseNet121(
    include_top=False,
    weights=None,
    input_shape=(224, 224, 3),
    pooling="avg",
)
model = tf.keras.Sequential(
    [
        tf.keras.Input(shape=(224, 224, 3), name="input_layer"),
        base,
        tf.keras.layers.BatchNormalization(name="batch_normalization"),
        tf.keras.layers.Dense(256, activation="relu", name="dense"),
        tf.keras.layers.Dropout(0.4, name="dropout"),
        tf.keras.layers.Dense(7, activation="softmax", name="dense_1"),
    ]
)
model.load_weights(MODEL_PATH)
_ = model(tf.zeros((1, 224, 224, 3)))

metadata = pd.read_csv(METADATA_PATH)
class_names = sorted(os.listdir(IMAGE_DIR))
print("Model loaded; classes:", class_names)

# %%
def preprocess_image(img_path, size=(224, 224)):
    img = cv2.imread(img_path)
    img = cv2.resize(img, size)
    img = img / 255.0
    return img

# %%
def predict_with_analysis(img_path):
    img = preprocess_image(img_path)
    input_img = np.expand_dims(img, axis=0)

    probs = model.predict(input_img)[0]

    # Top-3 predictions
    top_indices = np.argsort(probs)[::-1][:3]
    top_preds = [(class_names[i], float(probs[i])) for i in top_indices]

    # Confidence
    confidence = float(np.max(probs))

    # Entropy (uncertainty)
    entropy = -np.sum(probs * np.log(probs + 1e-10))

    # Image quality checks
    gray = cv2.cvtColor((img * 255).astype("uint8"), cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    brightness = np.mean(gray)

    warnings = []

    # Low confidence
    if confidence < 0.6:
        warnings.append("Low confidence prediction")

    # High entropy
    if entropy > 1.5:
        warnings.append("Model is uncertain")

    # Blur
    if blur_score < 50:
        warnings.append("Image is too blurry")

    # Lighting
    if brightness < 40 or brightness > 220:
        warnings.append("Poor lighting conditions")

    return {
        "top_predictions": top_preds,
        "confidence": confidence,
        "entropy": float(entropy),
        "blur_score": float(blur_score),
        "brightness": float(brightness),
        "warnings": warnings
    }


sample_dir = os.path.join(IMAGE_DIR, class_names[0])
sample_img = "C:\\Users\\devgo\\OneDrive\\Desktop\\Hacksagon models\\processed_images\\VASC\\ISIC_0032692.jpg"
for f in sorted(os.listdir(sample_dir)):
    if f.lower().endswith(".jpg"):
        sample_img = os.path.join(sample_dir, f)
        break
if sample_img is None:
    raise FileNotFoundError(f"No .jpg in {sample_dir}")

result = predict_with_analysis(sample_img)

print("Image:", sample_img)
print("Top Predictions:")
for cls, prob in result["top_predictions"]:
    print(f"{cls}: {prob:.2f}")

print("\nConfidence:", result["confidence"])
print("Warnings:", result["warnings"])

# %%



