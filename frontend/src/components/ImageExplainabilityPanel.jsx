import { useState } from 'react';
import { Eye, EyeOff, ZoomIn, X, Layers, LayoutGrid, Info, FlaskConical, ScanEye } from 'lucide-react';

/**
 * ImageExplainabilityPanel
 * Props:
 *   originalImage  — base64 string (JPEG)
 *   gradcamImage   — base64 string (JPEG)
 *   limeImage      — base64 string (JPEG)
 */
export function ImageExplainabilityPanel({ originalImage, gradcamImage, limeImage }) {
  // View mode: 'panels' = 3-column side-by-side, 'overlay' = single image + selectable overlay
  const [viewMode, setViewMode] = useState('panels');

  // Panel-level toggles (panels mode)
  const [showGradcam, setShowGradcam]   = useState(true);
  const [showLime, setShowLime]         = useState(true);

  // Opacity for each overlay (0-100)
  const [gradcamOpacity, setGradcamOpacity] = useState(60);
  const [limeOpacity, setLimeOpacity]       = useState(70);

  // Overlay mode: which overlay is active ('gradcam' | 'lime')
  const [activeOverlay, setActiveOverlay] = useState('gradcam');
  // Unified opacity slider used in overlay mode
  const overlayOpacity = activeOverlay === 'gradcam' ? gradcamOpacity : limeOpacity;
  const setOverlayOpacity = (val) =>
    activeOverlay === 'gradcam' ? setGradcamOpacity(val) : setLimeOpacity(val);

  // Lightbox
  const [zoomedSrc, setZoomedSrc] = useState(null);
  const [zoomedLabel, setZoomedLabel] = useState('');

  const openZoom = (src, label) => { setZoomedSrc(src); setZoomedLabel(label); };
  const closeZoom = () => setZoomedSrc(null);

  const imgSrc = (b64) => `data:image/jpeg;base64,${b64}`;

  // ── Sub-components ─────────────────────────────────────────────

  function PanelImage({ src, alt, label, borderColor = 'border-slate-200', onClick }) {
    return (
      <div className="relative group cursor-zoom-in" onClick={onClick}>
        <div className={`rounded-xl overflow-hidden bg-slate-950 aspect-square border-2 ${borderColor} shadow-md`}>
          <img src={src} alt={alt} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]" />
        </div>
        <button
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-white/20"
          onClick={onClick}
          aria-label={`Zoom ${label}`}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  function OpacitySlider({ value, onChange, accentClass = 'accent-trustBlue-600' }) {
    return (
      <div className="flex items-center gap-3">
        <input
          type="range" min="0" max="100" value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={`flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer ${accentClass}`}
        />
        <span className="text-xs font-mono font-semibold text-slate-500 w-8 text-right">{value}%</span>
      </div>
    );
  }

  function InfoBox({ color, icon: Icon, title, description, legend }) {
    return (
      <div className={`mt-3 rounded-xl p-3.5 border ${color.border} ${color.bg}`}>
        <div className="flex items-start gap-2">
          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color.icon}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${color.title} mb-0.5`}>{title}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
            {legend && (
              <div className="flex flex-wrap gap-2 mt-2">
                {legend.map((item) => (
                  <span key={item.label} className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
                    {item.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function TogglePill({ active, onClick, children, activeClass }) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
          active
            ? `${activeClass} border-transparent shadow-sm`
            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
        }`}
      >
        {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        {children}
      </button>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      {/* ── Lightbox ── */}
      {zoomedSrc && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeZoom}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-white text-sm font-semibold tracking-wide uppercase opacity-80">{zoomedLabel}</span>
              <button
                onClick={closeZoom}
                className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                aria-label="Close zoom"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl">
              <img src={zoomedSrc} alt={zoomedLabel} className="w-full max-h-[75vh] object-contain" />
            </div>
            <p className="text-center text-xs text-slate-400 mt-3">Click outside to close</p>
          </div>
        </div>
      )}

      {/* ── Panel Container ── */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">

        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-trustBlue-900 rounded-lg">
              <ScanEye className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Explainable AI Analysis</h3>
              <p className="text-xs text-slate-500">Grad-CAM &amp; LIME interpretability</p>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode('panels')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                viewMode === 'panels'
                  ? 'bg-trustBlue-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> 3-Panel View
            </button>
            <button
              onClick={() => setViewMode('overlay')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                viewMode === 'overlay'
                  ? 'bg-trustBlue-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Overlay Mode
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">

          {/* ══════════════════════════════════════════════════
              PANELS VIEW — 3 column grid
          ══════════════════════════════════════════════════ */}
          {viewMode === 'panels' && (
            <div className="space-y-5">

              {/* Panel visibility toggles */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-medium mr-1">Show layers:</span>
                <TogglePill
                  active={showGradcam}
                  onClick={() => setShowGradcam(!showGradcam)}
                  activeClass="bg-softRed-100 text-softRed-700"
                >
                  Grad-CAM
                </TogglePill>
                <TogglePill
                  active={showLime}
                  onClick={() => setShowLime(!showLime)}
                  activeClass="bg-sageGreen-100 text-sageGreen-700"
                >
                  LIME
                </TogglePill>
              </div>

              {/* 3-column grid */}
              <div className={`grid gap-5 ${ showGradcam && showLime ? 'md:grid-cols-3' : showGradcam || showLime ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-xs' }`}>

                {/* ── Column 1: Original ── */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Original Image</span>
                  </div>
                  <PanelImage
                    src={imgSrc(originalImage)}
                    alt="Original lesion"
                    label="Original Image"
                    borderColor="border-slate-200"
                    onClick={() => openZoom(imgSrc(originalImage), 'Original Image')}
                  />
                  <InfoBox
                    color={{ bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-400', title: 'text-slate-600' }}
                    icon={Info}
                    title="Reference Image"
                    description="Unmodified dermoscopic capture. Use this as the baseline when comparing the AI's highlighted regions."
                  />
                </div>

                {/* ── Column 2: Grad-CAM ── */}
                {showGradcam && (
                  <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-softRed-500" />
                      <span className="text-xs font-bold text-softRed-600 uppercase tracking-widest">AI Focus Area (Grad-CAM)</span>
                    </div>
                    <PanelImage
                      src={imgSrc(gradcamImage)}
                      alt="Grad-CAM heatmap"
                      label="AI Focus Area (Grad-CAM)"
                      borderColor="border-softRed-200"
                      onClick={() => openZoom(imgSrc(gradcamImage), 'AI Focus Area (Grad-CAM)')}
                    />
                    <div className="mt-2 space-y-1.5">
                      <label className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Brightness</span>
                      </label>
                      <OpacitySlider
                        value={gradcamOpacity}
                        onChange={setGradcamOpacity}
                        accentClass="accent-red-500"
                      />
                    </div>
                    <InfoBox
                      color={{ bg: 'bg-softRed-50', border: 'border-softRed-100', icon: 'text-softRed-500', title: 'text-softRed-700' }}
                      icon={ScanEye}
                      title="Grad-CAM — Gradient-weighted Class Activation Map"
                      description="Highlights the regions the convolutional network attended to most strongly when making its prediction. Warmer colours (red/yellow) indicate higher spatial importance."
                      legend={[
                        { label: 'High attention', dot: 'bg-red-500' },
                        { label: 'Medium attention', dot: 'bg-yellow-400' },
                        { label: 'Low attention', dot: 'bg-blue-400' },
                      ]}
                    />
                  </div>
                )}

                {/* ── Column 3: LIME ── */}
                {showLime && (
                  <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-sageGreen-500" />
                      <span className="text-xs font-bold text-sageGreen-600 uppercase tracking-widest">Feature Importance (LIME)</span>
                    </div>
                    <PanelImage
                      src={imgSrc(limeImage)}
                      alt="LIME explanation"
                      label="Feature Importance (LIME)"
                      borderColor="border-sageGreen-200"
                      onClick={() => openZoom(imgSrc(limeImage), 'Feature Importance (LIME)')}
                    />
                    <div className="mt-2 space-y-1.5">
                      <label className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Brightness</span>
                      </label>
                      <OpacitySlider
                        value={limeOpacity}
                        onChange={setLimeOpacity}
                        accentClass="accent-green-500"
                      />
                    </div>
                    <InfoBox
                      color={{ bg: 'bg-sageGreen-50', border: 'border-sageGreen-100', icon: 'text-sageGreen-600', title: 'text-sageGreen-700' }}
                      icon={FlaskConical}
                      title="LIME — Local Interpretable Model-Agnostic Explanations"
                      description="Decomposes the image into superpixels and identifies which regions pushed the prediction toward this diagnosis. Green areas contributed positively; grey/dark areas were neutral or suppressed."
                      legend={[
                        { label: 'Positive contribution', dot: 'bg-green-500' },
                        { label: 'Neutral / suppressed', dot: 'bg-slate-400' },
                      ]}
                    />
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              OVERLAY VIEW — Original + selectable overlay
          ══════════════════════════════════════════════════ */}
          {viewMode === 'overlay' && (
            <div className="grid lg:grid-cols-5 gap-6 animate-in fade-in duration-300">

              {/* Left: composite image */}
              <div className="lg:col-span-3">
                <div
                  className="relative aspect-square bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner cursor-zoom-in group"
                  onClick={() => openZoom(imgSrc(originalImage), 'Composite View')}
                >
                  {/* Base: original */}
                  <img
                    src={imgSrc(originalImage)}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-contain"
                  />

                  {/* Selectable overlay */}
                  {activeOverlay === 'gradcam' && (
                    <img
                      src={imgSrc(gradcamImage)}
                      alt="Grad-CAM overlay"
                      className="absolute inset-0 w-full h-full object-contain mix-blend-screen transition-opacity duration-300"
                      style={{ opacity: gradcamOpacity / 100 }}
                    />
                  )}
                  {activeOverlay === 'lime' && (
                    <img
                      src={imgSrc(limeImage)}
                      alt="LIME overlay"
                      className="absolute inset-0 w-full h-full object-contain mix-blend-screen transition-opacity duration-300"
                      style={{ opacity: limeOpacity / 100 }}
                    />
                  )}

                  {/* Active layer badge */}
                  <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border shadow-lg transition-all duration-300
                    ${activeOverlay === 'gradcam'
                      ? 'bg-softRed-900/80 text-white border-softRed-400/30'
                      : 'bg-sageGreen-900/80 text-white border-sageGreen-400/30'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeOverlay === 'gradcam' ? 'bg-red-400' : 'bg-green-400'}`} />
                    {activeOverlay === 'gradcam' ? 'Grad-CAM Active' : 'LIME Active'}
                  </div>

                  {/* Zoom hint */}
                  <div className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-slate-900/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Right: controls */}
              <div className="lg:col-span-2 flex flex-col gap-5">

                {/* Overlay selector */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Select Overlay</p>
                  <div className="flex flex-col gap-2">

                    <button
                      onClick={() => setActiveOverlay('gradcam')}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                        activeOverlay === 'gradcam'
                          ? 'border-softRed-400 bg-softRed-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-softRed-200 hover:bg-softRed-50/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${activeOverlay === 'gradcam' ? 'bg-softRed-500' : 'bg-slate-100'}`}>
                        <ScanEye className={`w-4 h-4 ${activeOverlay === 'gradcam' ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${activeOverlay === 'gradcam' ? 'text-softRed-700' : 'text-slate-700'}`}>Grad-CAM</p>
                        <p className="text-xs text-slate-500 mt-0.5">Model attention heatmap</p>
                      </div>
                      {activeOverlay === 'gradcam' && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-softRed-500 mt-1 shrink-0" />
                      )}
                    </button>

                    <button
                      onClick={() => setActiveOverlay('lime')}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                        activeOverlay === 'lime'
                          ? 'border-sageGreen-400 bg-sageGreen-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-sageGreen-200 hover:bg-sageGreen-50/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${activeOverlay === 'lime' ? 'bg-sageGreen-500' : 'bg-slate-100'}`}>
                        <FlaskConical className={`w-4 h-4 ${activeOverlay === 'lime' ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${activeOverlay === 'lime' ? 'text-sageGreen-700' : 'text-slate-700'}`}>LIME</p>
                        <p className="text-xs text-slate-500 mt-0.5">Superpixel feature importance</p>
                      </div>
                      {activeOverlay === 'lime' && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-sageGreen-500 mt-1 shrink-0" />
                      )}
                    </button>

                  </div>
                </div>

                {/* Opacity control */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">
                    Overlay Opacity
                  </label>
                  <OpacitySlider
                    value={overlayOpacity}
                    onChange={setOverlayOpacity}
                    accentClass={activeOverlay === 'gradcam' ? 'accent-red-500' : 'accent-green-500'}
                  />
                  <div className="flex justify-between mt-3 gap-1.5">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setOverlayOpacity(pct)}
                        className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                          overlayOpacity === pct
                            ? activeOverlay === 'gradcam'
                              ? 'bg-softRed-100 border-softRed-300 text-softRed-700'
                              : 'bg-sageGreen-100 border-sageGreen-300 text-sageGreen-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clinical context for active overlay */}
                {activeOverlay === 'gradcam' ? (
                  <InfoBox
                    color={{ bg: 'bg-softRed-50', border: 'border-softRed-100', icon: 'text-softRed-500', title: 'text-softRed-700' }}
                    icon={ScanEye}
                    title="Grad-CAM Interpretation"
                    description="Highlights regions the model focused on for prediction. Warmer colours (red/yellow) indicate higher spatial importance to the decision."
                    legend={[
                      { label: 'High attention', dot: 'bg-red-500' },
                      { label: 'Medium', dot: 'bg-yellow-400' },
                      { label: 'Low', dot: 'bg-blue-400' },
                    ]}
                  />
                ) : (
                  <InfoBox
                    color={{ bg: 'bg-sageGreen-50', border: 'border-sageGreen-100', icon: 'text-sageGreen-600', title: 'text-sageGreen-700' }}
                    icon={FlaskConical}
                    title="LIME Interpretation"
                    description="Shows specific superpixel regions that contributed positively to the prediction. Green areas increased model confidence; dark areas were neutral or suppressive."
                    legend={[
                      { label: 'Positive', dot: 'bg-green-500' },
                      { label: 'Neutral', dot: 'bg-slate-400' },
                    ]}
                  />
                )}

              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
