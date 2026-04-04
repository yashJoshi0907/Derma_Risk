import os
import cv2
import numpy as np

from model_loader import cnn_only_model as model, CLASS_NAMES as class_names

def predict_with_analysis(image_bytes):
    """
    Run prediction and uncertainty/quality analysis on image bytes.
    """
    # Decode bytes to numpy array (BGR for cv2)
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    img_resized = cv2.resize(img, (224, 224))
    img_preprocessed = img_resized / 255.0
    input_img = np.expand_dims(img_preprocessed, axis=0)

    # Use the shared model instead of loading a new one
    probs = model.predict(input_img, verbose=0)[0]

    # Top-3 predictions
    top_indices = np.argsort(probs)[::-1][:3]
    top_preds = [(class_names[i], float(probs[i])) for i in top_indices]

    # Confidence
    confidence = float(np.max(probs))

    # Entropy (uncertainty)
    entropy = -np.sum(probs * np.log(probs + 1e-10))

    # Image quality checks
    gray = cv2.cvtColor((img_resized * 255).astype("uint8"), cv2.COLOR_BGR2GRAY)
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
        "warnings": warnings
    }