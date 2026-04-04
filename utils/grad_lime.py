# %% [markdown]
# # LIME v4 — Lesion-Only Perturbation
# ### Key change: LIME only masks superpixels INSIDE the lesion. Background is frozen.
# ### This forces the explanation to be about internal lesion features only.

# %%
# ── USER SETTINGS ─────────────────────────────────────────────────────────────
IMAGE_PATH = r"C:\Users\devgo\OneDrive\Desktop\Hacksagon models\processed_images\VASC\ISIC_0032270.jpg"
MODEL_PATH = r"C:\Users\devgo\OneDrive\Desktop\Hacksagon models\model\densenet121_skin_classifier.h5"

NUM_SAMPLES  = 200   # higher = more stable results

NUM_SEGMENTS = 60     # superpixels inside lesion only
NUM_FEATURES = 12     # top regions to highlight
# ──────────────────────────────────────────────────────────────────────────────

# %%
# ── Cell 1: Imports ────────────────────────────────────────────────────────────
import numpy as np
import cv2
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import tensorflow as tf
from tensorflow.keras.applications.densenet import preprocess_input
from lime import lime_image
from skimage.segmentation import slic, mark_boundaries, felzenszwalb
from scipy.ndimage import gaussian_filter
import warnings
warnings.filterwarnings('ignore')

CLASS_NAMES = ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc']
RISK_MAP = {
    'mel':   ('HIGH',   '#d32f2f'),
    'bcc':   ('HIGH',   '#d32f2f'),
    'akiec': ('HIGH',   '#d32f2f'),
    'bkl':   ('MEDIUM', '#f57c00'),
    'nv':    ('LOW',    '#388e3c'),
    'df':    ('LOW',    '#388e3c'),
    'vasc':  ('LOW',    '#388e3c'),
}

if __name__ == "__main__":
    print('✅ Imports OK')
    # %%
    # ── Cell 2: Load model ─────────────────────────────────────────────────────────
    tf.keras.backend.clear_session()
    base = tf.keras.applications.DenseNet121(
        include_top=False, weights=None,
        input_shape=(224, 224, 3), pooling='avg'
    )
    model = tf.keras.Sequential([
        tf.keras.Input(shape=(224, 224, 3)),
        base,
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dense(256, activation='relu'),
        tf.keras.layers.Dropout(0.4),
        tf.keras.layers.Dense(7, activation='softmax'),
    ])
    model.load_weights(MODEL_PATH)
    print('✅ Model loaded')

    # %%
    # ── Cell 3: Preprocessing + lesion detection ───────────────────────────────────
    def preprocess_image(image_path):
        bgr = cv2.imread(image_path)
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        h, w = rgb.shape[:2]
        s = min(h, w)
        y0, x0 = (h - s) // 2, (w - s) // 2
        crop    = rgb[y0:y0+s, x0:x0+s]
        raw_224 = cv2.resize(crop, (224, 224), interpolation=cv2.INTER_AREA)
        arr     = preprocess_input(np.expand_dims(raw_224.astype(np.float32), 0))
        return arr, raw_224

    def detect_lesion_mask(img_rgb):
        """Multi-method lesion mask: grayscale Otsu + saturation Otsu, largest component."""
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        hsv  = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        sat  = hsv[:, :, 1]
        blur_g = cv2.GaussianBlur(gray, (21, 21), 0)
        blur_s = cv2.GaussianBlur(sat,  (21, 21), 0)
        _, t_gray = cv2.threshold(blur_g, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        _, t_sat  = cv2.threshold(blur_s, 0, 255, cv2.THRESH_BINARY     + cv2.THRESH_OTSU)
        combined  = cv2.bitwise_or(t_gray, t_sat)
        kernel    = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
        mask      = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
        mask      = cv2.morphologyEx(mask,     cv2.MORPH_OPEN,  kernel)
        # Keep largest connected component
        n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        if n > 1:
            largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            mask = (labels == largest).astype(np.uint8) * 255
        return mask.astype(bool)

    img_array, raw_224 = preprocess_image(IMAGE_PATH)
    lesion_mask = detect_lesion_mask(raw_224)

    preds      = model.predict(img_array, verbose=0)[0]
    pred_idx   = np.argmax(preds)
    pred_class = CLASS_NAMES[pred_idx]
    confidence = preds[pred_idx] * 100
    risk, risk_color = RISK_MAP[pred_class]

    lesion_area_pct = lesion_mask.mean() * 100
    print(f'Predicted : {pred_class.upper()}  ({confidence:.2f}%)  Risk: {risk}')
    print(f'Lesion area: {lesion_area_pct:.1f}% of image')

    # Preview mask
    fig, axes = plt.subplots(1, 2, figsize=(8, 4))
    axes[0].imshow(raw_224); axes[0].contour(lesion_mask, colors='yellow', linewidths=2)
    axes[0].set_title('Detected lesion boundary'); axes[0].axis('off')
    masked_vis = raw_224.copy().astype(float)
    masked_vis[~lesion_mask] *= 0.25
    axes[1].imshow(masked_vis.astype(np.uint8))
    axes[1].set_title('Lesion region only'); axes[1].axis('off')
    plt.tight_layout(); plt.savefig('lesion_mask_preview.png', dpi=120, bbox_inches='tight')
    plt.show()

    # %%
    # ── Cell 4: Lesion-only segmentation ──────────────────────────────────────────
    # THE KEY IDEA:
    # All background pixels get segment ID = 0 (one fixed segment, never perturbed).
    # Only pixels INSIDE the lesion get unique segment IDs (1..N).
    # When LIME masks segment 0, nothing visible changes → model ignores it.
    # So LIME's perturbations only reveal importance of INTERNAL lesion regions.

    def make_lesion_only_segments(img_rgb, mask, n_segments=60, compactness=6, sigma=1.0):
        """
        Segments only the lesion interior.
        Background = segment 0 (frozen).
        Lesion regions = segments 1..N.
        """
        # Run SLIC only on lesion pixels (pad with mean color outside)
        img_float = img_rgb.astype(np.float32) / 255.0
        # Replace background with lesion mean so SLIC doesn't waste segments there
        lesion_mean = img_float[mask].mean(axis=0)
        img_for_slic = img_float.copy()
        img_for_slic[~mask] = lesion_mean

        seg = slic((img_for_slic * 255).astype(np.uint8),
                   n_segments=n_segments,
                   compactness=compactness,
                   sigma=sigma,
                   start_label=1,
                   channel_axis=2)

        # Force all background pixels to segment 0
        seg[~mask] = 0
        return seg


    lesion_segments = make_lesion_only_segments(
        raw_224, lesion_mask, n_segments=NUM_SEGMENTS
    )

    n_lesion_segs = len(np.unique(lesion_segments)) - 1  # exclude background (0)
    print(f'Lesion segments: {n_lesion_segs}  |  Background: 1 frozen segment (id=0)')

    # Preview — show only lesion segments coloured, background grey
    vis = raw_224.copy().astype(float)
    vis[~lesion_mask] = [180, 180, 180]  # grey background for clarity
    vis_boundaries = mark_boundaries((vis/255).clip(0,1), lesion_segments,
                                      color=(1, 1, 0), mode='thick')

    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    axes[0].imshow(raw_224)
    axes[0].set_title('Original'); axes[0].axis('off')
    axes[1].imshow(vis_boundaries)
    axes[1].set_title(f'Lesion-only segments ({n_lesion_segs} active, background frozen)')
    axes[1].axis('off')
    plt.tight_layout(); plt.savefig('lesion_segments_preview.png', dpi=120, bbox_inches='tight')
    plt.show()

    # %%
    # ── Cell 5: Custom predict function with frozen background ────────────────────
    # When LIME hides segment 0 (background), we replace it with the ORIGINAL
    # background pixels — not black, not mean color — so the model always
    # sees a realistic background regardless of which lesion segments are masked.

    ORIGINAL_BG = raw_224.copy()  # used to restore background in every perturbation

    def predict_fn_lesion_only(images):
        """
        For each perturbed image LIME sends:
        1. Restore original background pixels (segment 0 area)
        2. Apply preprocess_input
        3. Run model
        This means ONLY lesion-interior changes affect model output.
        """
        restored = images.copy().astype(np.float32)
        bg_pixels = ~lesion_mask  # 2D bool mask
        for i in range(len(restored)):
            restored[i][bg_pixels] = ORIGINAL_BG[bg_pixels].astype(np.float32)
        batch = preprocess_input(restored)
        return model.predict(batch, verbose=0)

    def seg_fn(image):
        return lesion_segments

    print('✅ Lesion-only predict function ready')
    print('   Background pixels are FROZEN to original values in every LIME perturbation.')

    # %%
    # ── Cell 6: Run LIME ───────────────────────────────────────────────────────────
    explainer = lime_image.LimeImageExplainer(random_state=42)

    print(f'Running lesion-only LIME ({NUM_SAMPLES} samples, {n_lesion_segs} active segments)…')
    explanation = explainer.explain_instance(
        raw_224,
        predict_fn_lesion_only,
        top_labels=7,
        hide_color=None,           # mean color of each superpixel when hidden
        num_samples=NUM_SAMPLES,
        segmentation_fn=seg_fn,
        batch_size=128,
    )
    print('✅ LIME done')

    # %%
    # ── Cell 7: Helper functions ───────────────────────────────────────────────────
    def get_smooth_heatmap(explanation, label, segments, sigma=5, lesion_only=True):
        """Per-pixel importance with Gaussian smoothing. Outside lesion = 0 if lesion_only."""
        weights = dict(explanation.local_exp[label])
        heatmap = np.zeros(segments.shape, dtype=np.float32)
        for sid, w in weights.items():
            if sid == 0: continue   # skip frozen background segment
            heatmap[segments == sid] = w
        if lesion_only:
            heatmap[~lesion_mask] = 0.0
        mx = np.abs(heatmap).max()
        if mx > 0: heatmap /= mx
        heatmap = gaussian_filter(heatmap, sigma=sigma)
        mx = np.abs(heatmap).max()
        if mx > 0: heatmap /= mx
        if lesion_only:
            heatmap[~lesion_mask] = 0.0
        return heatmap

    def heatmap_overlay(img_rgb, heatmap, alpha=0.6, lesion_mask=None):
        """Blend heatmap over image. Outside lesion kept at original if mask given."""
        cmap  = plt.get_cmap('RdYlGn')
        rgba  = cmap((heatmap + 1) / 2)
        color = (rgba[..., :3] * 255).astype(np.uint8)
        blended = cv2.addWeighted(img_rgb, 1-alpha, color, alpha, 0)
        if lesion_mask is not None:
            result = img_rgb.copy()
            result[lesion_mask] = blended[lesion_mask]
            return result
        return blended

    def show_lesion_mask_overlay(ax, img, explanation, label, mode='pos',
                                  num_features=NUM_FEATURES, title=''):
        """Show LIME mask but only inside lesion boundary."""
        pos_only = (mode == 'pos')
        neg_only = (mode == 'neg')
        _, mask = explanation.get_image_and_mask(
            label, positive_only=pos_only, negative_only=neg_only,
            num_features=num_features, hide_rest=False,
        )
        # Restrict mask to lesion interior
        mask = mask & lesion_mask
        c = (0,1,0) if pos_only else (1,0,0) if neg_only else (1,1,0)
        overlay = mark_boundaries(img/255.0 if img.max()>1 else img,
                                   mask, color=c, mode='thick')
        ax.contour(lesion_mask, colors='yellow', linewidths=1.2)
        ax.imshow(overlay); ax.set_title(title, fontsize=9); ax.axis('off')

    def focus_score(heatmap, mask):
        inside  = heatmap[mask].mean()  if mask.any()   else 0.0
        outside = heatmap[~mask].mean() if (~mask).any() else 0.0
        return inside, outside

    print('✅ Helpers ready')

    # %%
    # ── Cell 8: Main result plot ───────────────────────────────────────────────────
    hm   = get_smooth_heatmap(explanation, pred_idx, lesion_segments, sigma=5)
    ov   = heatmap_overlay(raw_224, hm, alpha=0.65, lesion_mask=lesion_mask)
    i_v, o_v = focus_score(hm, lesion_mask)

    fig, axes = plt.subplots(1, 5, figsize=(22, 4))
    fig.suptitle(
        f'LIME v4 (Lesion-Only) — {pred_class.upper()} | {confidence:.2f}% | Risk: {risk}\n'
        f'Inside: {i_v:+.3f}  Outside: {o_v:+.3f}',
        fontsize=12, fontweight='bold', color=risk_color
    )

    axes[0].imshow(raw_224); axes[0].contour(lesion_mask, colors='yellow', linewidths=1.5)
    axes[0].set_title('Original + boundary'); axes[0].axis('off')

    show_lesion_mask_overlay(axes[1], raw_224, explanation, pred_idx, mode='pos',
                              title='Supporting (green)\nlesion-only')
    show_lesion_mask_overlay(axes[2], raw_224, explanation, pred_idx, mode='neg',
                              title='Opposing (red)\nlesion-only')
    show_lesion_mask_overlay(axes[3], raw_224, explanation, pred_idx, mode='both',
                              title='Both combined')

    axes[4].imshow(ov); axes[4].contour(lesion_mask, colors='yellow', linewidths=1.5)
    axes[4].set_title('Smooth heatmap overlay\n(lesion region only)'); axes[4].axis('off')

    plt.tight_layout()
    plt.savefig('lime_v4_main.png', dpi=150, bbox_inches='tight')
    plt.show()
    print('Saved: lime_v4_main.png')

    # %%
    # ── Cell 9: Top-3 class breakdown ─────────────────────────────────────────────
    top3_idx = np.argsort(preds)[::-1][:3]

    fig, axes = plt.subplots(3, 5, figsize=(22, 13))
    fig.suptitle('LIME v4 — Top-3 Class Breakdown (Lesion-Only Perturbation)',
                 fontsize=14, fontweight='bold')

    for row, idx in enumerate(top3_idx):
        name  = CLASS_NAMES[idx]
        conf  = preds[idx] * 100
        r, rc = RISK_MAP[name]
        hm    = get_smooth_heatmap(explanation, idx, lesion_segments, sigma=5)
        ov    = heatmap_overlay(raw_224, hm, alpha=0.65, lesion_mask=lesion_mask)
        i_v, o_v = focus_score(hm, lesion_mask)
        status = '✅ lesion focused' if i_v > o_v else '⚠️ still background'

        axes[row,0].imshow(raw_224)
        axes[row,0].contour(lesion_mask, colors='yellow', linewidths=1.2)
        axes[row,0].set_title(
            f'{name.upper()} ({conf:.1f}%) — {r}\n{status}  in={i_v:+.3f} out={o_v:+.3f}',
            fontsize=9, color=rc, fontweight='bold'
        )
        axes[row,0].axis('off')

        show_lesion_mask_overlay(axes[row,1], raw_224, explanation, idx,
                                  mode='pos', title='Supporting')
        show_lesion_mask_overlay(axes[row,2], raw_224, explanation, idx,
                                  mode='neg', title='Opposing')

        axes[row,3].imshow(ov)
        axes[row,3].contour(lesion_mask, colors='yellow', linewidths=1.2)
        axes[row,3].set_title('Smooth overlay')
        axes[row,3].axis('off')

        im = axes[row,4].imshow(hm, cmap='RdYlGn', vmin=-1, vmax=1)
        axes[row,4].contour(lesion_mask, colors='yellow', linewidths=1.2)
        axes[row,4].set_title('Heatmap (lesion only)')
        axes[row,4].axis('off')
        plt.colorbar(im, ax=axes[row,4], fraction=0.046, pad=0.04)

    plt.tight_layout()
    plt.savefig('lime_v4_top3.png', dpi=150, bbox_inches='tight')
    plt.show()
    print('Saved: lime_v4_top3.png')

    # %%
    # ── Cell 10: Intra-lesion region importance map ────────────────────────────────
    # Divides lesion into zones (core, mid-ring, outer-ring) and scores each.
    # Helps understand WHICH PART of the lesion the model cares about.

    def lesion_zone_analysis(img_rgb, heatmap, mask):
        dist = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 5)
        max_dist = dist.max()
        if max_dist == 0:
            print('Lesion mask too small for zone analysis'); return
        dist_norm = dist / max_dist   # 0=edge, 1=center

        core      = mask & (dist_norm > 0.66)
        mid_ring  = mask & (dist_norm > 0.33) & (dist_norm <= 0.66)
        outer_ring= mask & (dist_norm <= 0.33)

        scores = {
            'Core (center)':   heatmap[core].mean()       if core.any()       else 0.0,
            'Mid ring':        heatmap[mid_ring].mean()   if mid_ring.any()   else 0.0,
            'Outer ring':      heatmap[outer_ring].mean() if outer_ring.any() else 0.0,
        }

        fig, axes = plt.subplots(1, 4, figsize=(16, 4))
        fig.suptitle(f'Intra-lesion Zone Analysis — {pred_class.upper()}',
                     fontsize=12, fontweight='bold')

        zone_vis = np.zeros((*mask.shape, 3), dtype=np.uint8)
        zone_vis[core]       = [0,   200, 0  ]   # green
        zone_vis[mid_ring]   = [255, 165, 0  ]   # orange
        zone_vis[outer_ring] = [200, 0,   0  ]   # red
        blend = cv2.addWeighted(img_rgb, 0.5, zone_vis, 0.5, 0)

        axes[0].imshow(blend)
        axes[0].set_title('Zones: green=core\norange=mid, red=outer')
        axes[0].axis('off')

        im = axes[1].imshow(heatmap, cmap='RdYlGn', vmin=-1, vmax=1)
        axes[1].contour(core,       colors='lime',   linewidths=1)
        axes[1].contour(outer_ring, colors='yellow', linewidths=1)
        axes[1].set_title('Heatmap with zone boundaries')
        axes[1].axis('off')
        plt.colorbar(im, ax=axes[1], fraction=0.046, pad=0.04)

        zones   = list(scores.keys())
        vals    = list(scores.values())
        colors  = ['#388e3c' if v > 0 else '#d32f2f' for v in vals]
        axes[2].barh(zones, vals, color=colors, edgecolor='white')
        axes[2].axvline(0, color='black', linewidth=0.8)
        axes[2].set_xlabel('Mean LIME importance')
        axes[2].set_title('Zone importance scores')
        for i, v in enumerate(vals):
            axes[2].text(v + 0.01 * np.sign(v), i, f'{v:+.3f}', va='center', fontsize=9)

        prob_colors = [RISK_MAP[c][1] for c in CLASS_NAMES]
        axes[3].barh(CLASS_NAMES, preds * 100, color=prob_colors, edgecolor='white')
        for i, (p, c) in enumerate(zip(preds, CLASS_NAMES)):
            axes[3].text(p*100 + 0.3, i, f'{p*100:.1f}%', va='center', fontsize=9)
        axes[3].set_xlabel('Probability (%)')
        axes[3].set_title('Class probabilities')
        axes[3].set_xlim(0, 115)

        plt.tight_layout()
        plt.savefig('lime_v4_zones.png', dpi=150, bbox_inches='tight')
        plt.show()

        print('\nZone importance scores:')
        for z, s in scores.items():
            print(f'  {z:20s}: {s:+.4f}')
        best_zone = max(scores, key=lambda k: abs(scores[k]))
        print(f'\nMost important zone: {best_zone}')
        return scores

    hm_final = get_smooth_heatmap(explanation, pred_idx, lesion_segments, sigma=4)
    zone_scores = lesion_zone_analysis(raw_224, hm_final, lesion_mask)
    print('Saved: lime_v4_zones.png')

    # %%
    # ── Cell 11: Diagnostic summary ───────────────────────────────────────────────
    hm_check = get_smooth_heatmap(explanation, pred_idx, lesion_segments, sigma=4)
    i_final, o_final = focus_score(hm_check, lesion_mask)

    print('=' * 60)
    print('        LIME v4 DIAGNOSTIC SUMMARY')
    print('=' * 60)
    print(f'Prediction : {pred_class.upper()}  ({confidence:.2f}%)  Risk: {risk}')
    print(f'Lesion area: {lesion_area_pct:.1f}% of image')
    print(f'Active segs: {n_lesion_segs} (inside lesion only)')
    print()
    print(f'Inside lesion importance : {i_final:+.4f}')
    print(f'Outside lesion importance: {o_final:+.4f}')
    print()
    if i_final > o_final:
        print('✅ SUCCESS: Lesion-only perturbation is working.')
        print('   The model is now evaluated purely on internal lesion features.')
    else:
        print('⚠️  Outside still slightly higher — this can happen when:')
        print('   1. Lesion mask is slightly too small (try reducing morph kernel in Cell 3)')
        print('   2. Gaussian smoothing bleeds importance outward (reduce sigma in Cell 10)')
        print('   3. The model genuinely uses border features — consider Path 1 (retrain)')
    print('=' * 60)

    # %%
    base_model = model.get_layer("densenet121")

    last_conv_layer = base_model.get_layer("conv5_block16_concat")

    conv_model = tf.keras.Model(
        inputs=base_model.input,
        outputs=last_conv_layer.output
    )

    classifier_input = tf.keras.Input(shape=last_conv_layer.output.shape[1:])

    x = classifier_input
    x = tf.keras.layers.GlobalAveragePooling2D()(x)

    x = model.layers[1](x)  # BN
    x = model.layers[2](x)  # Dense
    x = model.layers[3](x)  # Dropout
    output = model.layers[4](x)

    classifier_model = tf.keras.Model(classifier_input, output)

    print("✅ Split models ready")

    # %%
    import cv2
    import numpy as np
    from tensorflow.keras.applications.densenet import preprocess_input

    def crop_center(img, size=180):
        h, w, _ = img.shape
        startx = w//2 - size//2
        starty = h//2 - size//2
        return img[starty:starty+size, startx:startx+size]

    def preprocess_image(img_path):
        img = cv2.imread(img_path)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # 🔥 Crop center (reduce background noise)
        img = crop_center(img)

        # Resize
        img = cv2.resize(img, (224, 224))

        # 🔥 DenseNet preprocessing
        img = preprocess_input(img)

        return img

    # %%
    def make_gradcam(img_array):

        with tf.GradientTape() as tape:
            conv_outputs = conv_model(img_array)
            tape.watch(conv_outputs)

            predictions = classifier_model(conv_outputs)

            pred_index = tf.argmax(predictions[0])
            class_channel = predictions[:, pred_index]

        grads = tape.gradient(class_channel, conv_outputs)

        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

        conv_outputs = conv_outputs[0]

        heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)

        # ReLU + normalize
        heatmap = tf.maximum(heatmap, 0)
        heatmap = heatmap / (tf.reduce_max(heatmap) + 1e-8)

        heatmap = heatmap.numpy()

        # 🔥 Smooth heatmap
        heatmap = cv2.GaussianBlur(heatmap, (15, 15), 0)

        return heatmap, pred_index.numpy()

    # %%
    def overlay_gradcam(img_path, heatmap, alpha=0.6):
        img = cv2.imread(img_path)
        img = cv2.resize(img, (224, 224))

        heatmap = cv2.resize(heatmap, (224, 224))
        heatmap = np.uint8(255 * heatmap)

        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

        superimposed_img = heatmap * alpha + img

        return np.uint8(superimposed_img)

    # %%
    import matplotlib.pyplot as plt

    # 🔥 CHANGE IMAGE PATH
    img_path = r"C:\Users\devgo\OneDrive\Desktop\Hacksagon models\processed_images\NV\ISIC_0024306.jpg"

    img = preprocess_image(img_path)
    img_array = np.expand_dims(img, axis=0)

    heatmap, pred_class = make_gradcam(img_array)

    overlay = overlay_gradcam(img_path, heatmap)

    plt.figure(figsize=(10,4))

    plt.subplot(1,2,1)
    plt.title("Original")
    plt.imshow(cv2.cvtColor(cv2.imread(img_path), cv2.COLOR_BGR2RGB))
    plt.axis("off")

    plt.subplot(1,2,2)
    plt.title(f"Improved Grad-CAM (Class {pred_class})")
    plt.imshow(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB))
    plt.axis("off")

    plt.show()

def lime_overlay_rgb(model, raw_224):
    """
    LIME v4 smooth overlay (same as ``ov`` in this file). Used by predict.py.
    Inlined helpers so this works when the notebook demo above is not executed.
    """
    def _detect_lesion_mask(img_rgb):
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        sat = hsv[:, :, 1]
        blur_g = cv2.GaussianBlur(gray, (21, 21), 0)
        blur_s = cv2.GaussianBlur(sat, (21, 21), 0)
        _, t_gray = cv2.threshold(blur_g, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        _, t_sat = cv2.threshold(blur_s, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        combined = cv2.bitwise_or(t_gray, t_sat)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
        mask = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
        if n > 1:
            largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            mask = (labels == largest).astype(np.uint8) * 255
        return mask.astype(bool)

    def _make_lesion_only_segments(img_rgb, mask, n_segments=60, compactness=6, sigma=1.0):
        img_float = img_rgb.astype(np.float32) / 255.0
        lesion_mean = img_float[mask].mean(axis=0)
        img_for_slic = img_float.copy()
        img_for_slic[~mask] = lesion_mean
        seg = slic(
            (img_for_slic * 255).astype(np.uint8),
            n_segments=n_segments,
            compactness=compactness,
            sigma=sigma,
            start_label=1,
            channel_axis=2,
        )
        seg[~mask] = 0
        return seg

    img_array = preprocess_input(np.expand_dims(raw_224.astype(np.float32), 0))
    lesion_mask = _detect_lesion_mask(raw_224)
    lesion_segments = _make_lesion_only_segments(
        raw_224, lesion_mask, n_segments=NUM_SEGMENTS
    )
    original_bg = raw_224.copy()

    def predict_fn_lesion_only(images):
        restored = images.copy().astype(np.float32)
        bg_pixels = ~lesion_mask
        for i in range(len(restored)):
            restored[i][bg_pixels] = original_bg[bg_pixels].astype(np.float32)
        batch = preprocess_input(restored)
        return model.predict(batch, verbose=0)

    def seg_fn(image):
        return lesion_segments

    explainer = lime_image.LimeImageExplainer(random_state=42)
    preds = model.predict(img_array, verbose=0)[0]
    pred_idx = int(np.argmax(preds))
    explanation = explainer.explain_instance(
        raw_224,
        predict_fn_lesion_only,
        top_labels=7,
        hide_color=None,
        num_samples=NUM_SAMPLES,
        segmentation_fn=seg_fn,
        batch_size=128,
    )

    weights = dict(explanation.local_exp[pred_idx])
    heatmap = np.zeros(lesion_segments.shape, dtype=np.float32)
    for sid, w in weights.items():
        if sid == 0:
            continue
        heatmap[lesion_segments == sid] = w
    heatmap[~lesion_mask] = 0.0
    mx = np.abs(heatmap).max()
    if mx > 0:
        heatmap /= mx
    heatmap = gaussian_filter(heatmap, sigma=5)
    mx = np.abs(heatmap).max()
    if mx > 0:
        heatmap /= mx
    heatmap[~lesion_mask] = 0.0

    cmap = plt.get_cmap("RdYlGn")
    rgba = cmap((heatmap + 1) / 2)
    color = (rgba[..., :3] * 255).astype(np.uint8)
    blended = cv2.addWeighted(raw_224, 1 - 0.65, color, 0.65, 0)
    result = raw_224.copy()
    result[lesion_mask] = blended[lesion_mask]
    return result

# %%



