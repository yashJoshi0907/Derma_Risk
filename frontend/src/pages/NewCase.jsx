import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { UploadCloud, CheckCircle2, ChevronRight, Activity, Microscope, Image as ImageIcon, Sparkles, LayoutPanelLeft } from 'lucide-react';

const STEPS = ['Upload Image', 'Patient Context', 'Analysis', 'Results'];

export function NewCase() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  
  const [metadata, setMetadata] = useState({ age: '', sex: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isSideBySide, setIsSideBySide] = useState(false);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith('image/')) {
      handleFileSelection(dropped);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setCurrentStep(1); // Proceed to Metadata
  };

  const handleSubmit = async () => {
    setLoading(true);
    setCurrentStep(2); // Analysis Loading state

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (metadata.age) formData.append('age', metadata.age);
      if (metadata.sex) formData.append('sex', metadata.sex.toLowerCase());
      if (metadata.location) formData.append('location', metadata.location.toLowerCase());

      const res = await api.post('/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setResult(res.data);
      setCurrentStep(3); // Results state
    } catch (err) {
      console.error("Prediction failed:", err);
      // fallback or error handling here
      alert("Analysis failed. Please try again.");
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  // Encoders mock lists for UI
  const sexOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'unknown', label: 'Unknown/Other' }
  ];

  const locationOptions = [
    { value: 'back', label: 'Back' },
    { value: 'lower extremity', label: 'Lower Extremity' },
    { value: 'trunk', label: 'Trunk' },
    { value: 'upper extremity', label: 'Upper Extremity' },
    { value: 'abdomen', label: 'Abdomen' },
    { value: 'face', label: 'Face' },
    { value: 'chest', label: 'Chest' },
    { value: 'foot', label: 'Foot' },
    { value: 'neck', label: 'Neck' },
    { value: 'scalp', label: 'Scalp' },
    { value: 'hand', label: 'Hand' },
    { value: 'ear', label: 'Ear' },
    { value: 'genital', label: 'Genital' },
    { value: 'acral', label: 'Acral' },
    { value: 'unknown', label: 'Unknown' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Stepper Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Clinical Screening</h1>
        <div className="flex gap-2">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors border-2
                ${idx < currentStep ? 'bg-trustBlue-900 text-white border-trustBlue-900' : 
                  idx === currentStep ? 'bg-trustBlue-50 text-trustBlue-900 border-trustBlue-900' : 
                  'bg-white text-slate-400 border-slate-200'}
              `}>
                {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${idx <= currentStep ? 'text-slate-900' : 'text-slate-400'}`}>
                {step}
              </span>
              {idx < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <Card className="min-h-[500px]">
        <CardContent className="p-8 h-full flex flex-col justify-center">
          
          {currentStep === 0 && (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
              <div 
                className="w-full max-w-2xl p-12 border-2 border-dashed border-trustBlue-200 rounded-2xl bg-trustBlue-50/30 hover:bg-trustBlue-50 cursor-pointer transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto w-16 h-16 bg-trustBlue-100 rounded-full flex items-center justify-center mb-4 text-trustBlue-600">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-trustBlue-900">Upload Dermoscopic Image</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                  Drag and drop a high-resolution image of the lesion here, or click to browse. JPEG, PNG accepted.
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg, image/png" 
                  onChange={(e) => {
                    if (e.target.files[0]) handleFileSelection(e.target.files[0]);
                  }}
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="max-w-xl mx-auto w-full space-y-8 animate-in slide-in-from-right-8 duration-300">
              <div className="flex gap-6 items-start">
                {preview && (
                  <div className="shrink-0 w-32 h-32 rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-black">
                    <img src={preview} alt="Lesion preview" className="w-full h-full object-contain" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Patient Context</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Providing metadata improves the precision of the Two-Stage Intelligence Pipeline.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Patient Age</label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 45" 
                      min="0" max="120"
                      value={metadata.age}
                      onChange={(e) => setMetadata({...metadata, age: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Biological Sex</label>
                    <Select 
                      options={sexOptions} 
                      value={metadata.sex}
                      onChange={(e) => setMetadata({...metadata, sex: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Anatomical Location</label>
                  <Select 
                    options={locationOptions} 
                    value={metadata.location}
                    onChange={(e) => setMetadata({...metadata, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-6 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setCurrentStep(0)}>Change Image</Button>
                <Button onClick={handleSubmit} className="px-8">Initiate Analysis <Sparkles className="ml-2 w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col items-center py-20 animate-in fade-in duration-500">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-trustBlue-100 rounded-full"></div>
                <div className="w-24 h-24 border-4 border-trustBlue-900 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                <Microscope className="w-10 h-10 text-trustBlue-900 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-trustBlue-900 mt-8">Analyzing Lesion Signatures</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm text-center">
                Running through DenseNet baseline and interpreting spatial risk with Explainable AI pipelines...
              </p>
            </div>
          )}

          {currentStep === 3 && result && (
            <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8">
              {/* Results Hero */}
              <div className={`p-6 rounded-2xl border flex flex-col md:flex-row gap-6 items-start
                ${result.risk_level === 'high' ? 'bg-softRed-50 border-softRed-100' : ''}
                ${result.risk_level === 'medium' ? 'bg-statusAmber-50 border-statusAmber-100' : ''}
                ${result.risk_level === 'low' ? 'bg-sageGreen-50 border-sageGreen-100' : ''}
                ${!['high', 'medium', 'low'].includes(result.risk_level) ? 'bg-slate-50 border-slate-100' : ''}
              `}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0
                  ${result.risk_level === 'high' ? 'bg-softRed-100 text-softRed-600' : ''}
                  ${result.risk_level === 'medium' ? 'bg-statusAmber-100 text-statusAmber-600' : ''}
                  ${result.risk_level === 'low' ? 'bg-sageGreen-100 text-sageGreen-600' : ''}
                  ${!['high', 'medium', 'low'].includes(result.risk_level) ? 'bg-slate-200 text-slate-600' : ''}
                `}>
                  <Activity className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold uppercase tracking-wider opacity-70 mb-1">Risk Stratification: {result.risk_level}</h3>
                  <div className="flex items-baseline gap-4">
                    <h2 className="text-3xl font-bold text-slate-900">{result.full_name}</h2>
                    <span className="text-lg font-medium opacity-80 border-l px-4 border-slate-300">
                      Confidence: {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm opacity-80 max-w-2xl">
                    Predicted via {result.mode?.toUpperCase()} model. This is Clinical Decision Support data.
                    A biopsy is required for a definitive diagnosis.
                  </p>
                </div>
                <div className="shrink-0 flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                  <Button variant="primary">Schedule Follow-up</Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard/history')}>View Case History</Button>
                </div>
              </div>

              {/* Explainable AI UI */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-trustBlue-900 font-semibold">
                    <Sparkles className="w-5 h-5 text-trustBlue-600" />
                    Explainable AI (Grad-CAM)
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-sm">
                    <button 
                      onClick={() => setIsSideBySide(!isSideBySide)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${isSideBySide ? 'bg-trustBlue-100 text-trustBlue-900' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <LayoutPanelLeft className="w-4 h-4" /> Mode
                    </button>
                    <div className="w-px h-5 bg-slate-200"></div>
                    <button 
                      onClick={() => setShowOverlay(!showOverlay)}
                      className={`font-medium ${showOverlay ? 'text-trustBlue-700' : 'text-slate-400'}`}
                    >
                      {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {isSideBySide ? (
                    // Side-by-Side View
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-600 uppercase tracking-widest"><ImageIcon className="w-4 h-4" /> Original Lesion</h4>
                        <div className="rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto shadow-sm">
                          <img src={`data:image/jpeg;base64,${result.original_image}`} className="w-full h-full object-contain" alt="Original" />
                        </div>
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 mb-3 text-sm font-semibold text-softRed-600 uppercase tracking-widest"><Sparkles className="w-4 h-4" /> AI Focus Area</h4>
                        <div className="rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto shadow-sm border-2 border-softRed-100">
                          <img src={`data:image/jpeg;base64,${result.gradcam}`} className="w-full h-full object-contain" alt="Grad-CAM" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Overlay View
                    <div className="grid lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 relative aspect-video sm:aspect-square md:aspect-[4/3] max-h-[500px] mx-auto bg-black rounded-xl overflow-hidden shadow-inner border border-slate-100 group">
                        <img 
                          src={`data:image/jpeg;base64,${result.original_image}`} 
                          className="absolute inset-0 w-full h-full object-contain" 
                          alt="Original" 
                        />
                        {showOverlay && (
                          <img 
                            src={`data:image/jpeg;base64,${result.gradcam}`} 
                            className="absolute inset-0 w-full h-full object-contain mix-blend-screen transition-opacity duration-200"
                            style={{ opacity: overlayOpacity / 100 }}
                            alt="Heatmap" 
                          />
                        )}
                        {showOverlay && (
                          <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/20 shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            AI Focus Area Layer
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col justify-center space-y-6 lg:border-l lg:pl-8 border-slate-100">
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-2">Overlay Controls</h4>
                          <p className="text-sm text-slate-500 mb-6">
                            Adjust the Grad-CAM heatmap opacity. Red areas indicate high spatial importance for the network decision.
                          </p>
                          
                          <div className="space-y-4">
                            <label className="text-sm font-medium flex justify-between text-trustBlue-900">
                              Opacity Level <span>{overlayOpacity}%</span>
                            </label>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={showOverlay ? overlayOpacity : 0}
                              onChange={(e) => {
                                setShowOverlay(true); 
                                setOverlayOpacity(parseInt(e.target.value));
                              }}
                              className="w-full accent-trustBlue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="grid grid-cols-3 gap-2 pt-2">
                              <Button variant="outline" size="sm" onClick={() => {setShowOverlay(true); setOverlayOpacity(25);}} className={overlayOpacity === 25 && showOverlay ? 'border-trustBlue-500 text-trustBlue-700 bg-trustBlue-50' : ''}>25%</Button>
                              <Button variant="outline" size="sm" onClick={() => {setShowOverlay(true); setOverlayOpacity(50);}} className={overlayOpacity === 50 && showOverlay ? 'border-trustBlue-500 text-trustBlue-700 bg-trustBlue-50' : ''}>50%</Button>
                              <Button variant="outline" size="sm" onClick={() => {setShowOverlay(true); setOverlayOpacity(75);}} className={overlayOpacity === 75 && showOverlay ? 'border-trustBlue-500 text-trustBlue-700 bg-trustBlue-50' : ''}>75%</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
