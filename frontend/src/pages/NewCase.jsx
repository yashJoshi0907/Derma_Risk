import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ImageExplainabilityPanel } from '../components/ImageExplainabilityPanel';
import { ModelInsightsCard } from '../components/ModelInsightsCard';
import { UploadCloud, CheckCircle2, ChevronRight, Activity, Microscope, Sparkles } from 'lucide-react';

const STEPS = ['Upload Image', 'Patient Context', 'Analysis', 'Results'];

export function NewCase() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [metadata, setMetadata] = useState({ patientName: '', age: '', sex: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);


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
      if (metadata.patientName) formData.append('patient_name', metadata.patientName);
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
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Patient Name</label>
                  <Input
                    type="text"
                    placeholder="Enter patient's full name"
                    value={metadata.patientName}
                    onChange={(e) => setMetadata({ ...metadata, patientName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Patient Age</label>
                    <Input
                      type="number"
                      placeholder="e.g. 45"
                      min="0" max="120"
                      value={metadata.age}
                      onChange={(e) => setMetadata({ ...metadata, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">Biological Sex</label>
                    <Select
                      options={sexOptions}
                      value={metadata.sex}
                      onChange={(e) => setMetadata({ ...metadata, sex: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Anatomical Location</label>
                  <Select
                    options={locationOptions}
                    value={metadata.location}
                    onChange={(e) => setMetadata({ ...metadata, location: e.target.value })}
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

              {/* Explainable AI — LIME + Grad-CAM Panel */}
              <ImageExplainabilityPanel
                originalImage={result.original_image}
                gradcamImage={result.gradcam}
                limeImage={result.lime}
              />

              {/* Model Insights — Top Predictions + Warnings */}
              <ModelInsightsCard
                topPredictions={result.TOP_PREDICTIONS || []}
                warnings={result.WARNING_PRED || []}
              />

            </div>

          )}

        </CardContent>
      </Card>
    </div>
  );
}
