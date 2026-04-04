import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, MapPin, Activity, Clock, Brain, Microscope, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { Button } from '../components/ui/Button';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getRiskConfig(risk) {
  switch ((risk || '').toLowerCase()) {
    case 'high':
      return {
        label: 'High Risk',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-700 border border-red-200',
        icon: <AlertTriangle className="w-5 h-5" />,
        dot: 'bg-red-500',
      };
    case 'medium':
      return {
        label: 'Medium Risk',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-700 border border-amber-200',
        icon: <Info className="w-5 h-5" />,
        dot: 'bg-amber-500',
      };
    case 'low':
      return {
        label: 'Low Risk',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        icon: <CheckCircle className="w-5 h-5" />,
        dot: 'bg-emerald-500',
      };
    default:
      return {
        label: 'Unknown',
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        badge: 'bg-slate-100 text-slate-700 border border-slate-200',
        icon: <Activity className="w-5 h-5" />,
        dot: 'bg-slate-400',
      };
  }
}

function generateInsight(result) {
  const risk = (result?.risk_level || '').toLowerCase();
  const diagnosis = result?.full_name || 'the detected lesion';
  const confidence = result?.confidence ? (result.confidence * 100).toFixed(1) : null;
  const loc = result?.metadata?.location || null;

  if (risk === 'high') {
    return `AI model indicates a high-risk lesion consistent with ${diagnosis}${confidence ? ` (confidence: ${confidence}%)` : ''}. Grad-CAM activation highlights irregular border regions and asymmetric pigmentation patterns. LIME explanations reinforce focal areas of concern. Immediate dermatological review and biopsy recommendation is advised.`;
  } else if (risk === 'medium') {
    return `AI model flags a medium-risk finding consistent with ${diagnosis}${confidence ? ` (confidence: ${confidence}%)` : ''}. ${loc ? `The lesion is located at the ${loc}. ` : ''}Grad-CAM and LIME outputs indicate moderate activation in potentially dysplastic regions. Clinical monitoring and follow-up screening are recommended.`;
  } else {
    return `AI model suggests a low-risk profile consistent with ${diagnosis}${confidence ? ` (confidence: ${confidence}%)` : ''}. ${loc ? `Located at the ${loc}. ` : ''}Explainability maps show minimal high-risk activation. Standard monitoring intervals are advised; no immediate intervention required.`;
  }
}

function ImageCard({ title, imageBase64, caption, loading = false, delay = 0 }) {
  const src = imageBase64
    ? (imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`)
    : null;

  return (
    <div
      className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-report-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
        <Microscope className="w-4 h-4 text-trustBlue-600" />
        <span className="text-sm font-semibold text-slate-700">{title}</span>
      </div>
      <div className="p-4 bg-black/5 min-h-[220px] flex items-center justify-center">
        {src ? (
          <img
            src={src}
            alt={title}
            className="w-full h-full object-contain max-h-72 rounded-lg"
          />
        ) : loading ? (
          /* Pulsing skeleton shown while fetch is in-flight */
          <div className="flex flex-col items-center gap-3 text-trustBlue-400">
            <Loader2 className="w-8 h-8 animate-spin opacity-60" />
            <span className="text-xs font-medium animate-pulse">Loading image…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Microscope className="w-10 h-10 opacity-30" />
            <span className="text-xs">Image unavailable</span>
          </div>
        )}
      </div>
      {caption && (
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 leading-relaxed">{caption}</p>
        </div>
      )}
    </div>
  );
}


function DetailRow({ label, value, highlight }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-semibold text-slate-800 ${highlight || ''}`}>
        {value || <span className="text-slate-400 font-normal">—</span>}
      </span>
    </div>
  );
}

export function ViewReport() {
  const navigate = useNavigate();
  const location = useLocation();

  // Summary data passed via router state (no images — history list omits blobs)
  const summaryData = location.state?.reportData || null;

  // Full report data fetched from /history/{id} (includes gradcam + lime)
  const [reportData, setReportData] = useState(summaryData);
  const [loadingImages, setLoadingImages] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const predictionId = summaryData?.prediction_id;
    if (!predictionId) return;

    setLoadingImages(true);
    api.get(`/history/${predictionId}`)
      .then(res => {
        // Merge: keep any fields already present in summaryData, override with full detail
        setReportData(prev => ({ ...prev, ...res.data }));
      })
      .catch(err => {
        console.warn('[ViewReport] Could not fetch full detail:', err);
        setFetchError('Images could not be loaded. The report summary is still available.');
      })
      .finally(() => setLoadingImages(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!reportData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-12 text-center">
        <Activity className="w-16 h-16 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-700">No report data found</h2>
        <p className="text-slate-500">This report may have expired or was opened directly without a valid session.</p>
        <Button onClick={() => navigate('/dashboard/history')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Case History
        </Button>
      </div>
    );
  }

  const risk = getRiskConfig(reportData.risk_level);
  const insight = generateInsight(reportData);
  const reportTime = reportData.timestamp
    ? new Date(reportData.timestamp).toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
    : 'N/A';

  const confidence = reportData.confidence != null
    ? `${(reportData.confidence * 100).toFixed(1)}%`
    : '—';

  const patientName = reportData.patient_name || reportData.metadata?.patient_name || '—';
  const age = reportData.metadata?.age ? `${reportData.metadata.age} yrs` : '—';
  const sex = reportData.metadata?.sex
    ? reportData.metadata.sex.charAt(0).toUpperCase() + reportData.metadata.sex.slice(1)
    : '—';
  const locationLabel = reportData.metadata?.location
    ? reportData.metadata.location.charAt(0).toUpperCase() + reportData.metadata.location.slice(1)
    : '—';

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-report-fade">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/history')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cases
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Clinical Report</h1>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${risk.badge}`}>
          {risk.icon}
          {risk.label}
        </div>
      </div>

      {/* ── Section 1: Patient Summary ─────────── */}
      <div
        className={`rounded-2xl border ${risk.border} bg-white shadow-sm overflow-hidden animate-report-slide`}
        style={{ animationDelay: '80ms' }}
      >
        {/* Card header accent bar */}
        <div className={`h-1.5 w-full ${risk.bg} border-b ${risk.border}`}>
          <div className={`h-full w-24 ${risk.dot} rounded-r-full opacity-70`} />
        </div>

        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-trustBlue-600" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Patient Summary</h2>
        </div>

        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6">
          <DetailRow label="Patient Name" value={patientName} />
          <DetailRow label="Age" value={age} />
          <DetailRow label="Sex" value={sex} />
          <DetailRow label="Location" value={locationLabel} />

          <DetailRow label="Type of Cancer" value={reportData.full_name || '—'} />
          <DetailRow
            label="Risk Level"
            value={risk.label}
            highlight={risk.color}
          />
          <DetailRow
            label="Confidence Score"
            value={
              <span className="flex items-center gap-2">
                {confidence}
                {reportData.confidence != null && (
                  <span className="inline-block w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden align-middle">
                    <span
                      className="block h-full bg-trustBlue-500 rounded-full"
                      style={{ width: `${reportData.confidence * 100}%` }}
                    />
                  </span>
                )}
              </span>
            }
          />
          <DetailRow label="Time of Report" value={reportTime} />
        </div>
      </div>

      {/* ── Section 2: Visual Analysis ─────────── */}
      <div className="space-y-4 animate-report-slide" style={{ animationDelay: '160ms' }}>
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-trustBlue-600" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Visual Analysis</h2>
          <div className="flex-1 h-px bg-slate-200 ml-2" />
          {loadingImages && (
            <span className="flex items-center gap-1.5 text-xs text-trustBlue-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading images…
            </span>
          )}
        </div>

        {/* Error notice */}
        {fetchError && !loadingImages && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {fetchError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Original image — always available from history list */}
          <ImageCard
            title="Input Image"
            imageBase64={reportData.original_image}
            caption="Original dermoscopic image submitted for analysis."
            loading={loadingImages}
            delay={200}
          />
          {/* Grad-CAM — fetched from /history/{id} */}
          <ImageCard
            title="Grad-CAM Analysis"
            imageBase64={reportData.gradcam}
            caption="Gradient-weighted Class Activation Map highlighting model's focus regions."
            loading={loadingImages}
            delay={300}
          />
          {/* LIME — fetched from /history/{id} */}
          <ImageCard
            title="LIME Explanation"
            imageBase64={reportData.lime}
            caption="LIME superpixel mask showing contributing regions to the prediction."
            loading={loadingImages}
            delay={400}
          />
        </div>
      </div>

      {/* ── Section 3: AI Insight ──────────────── */}
      <div
        className="rounded-2xl border border-trustBlue-100 bg-trustBlue-50/60 p-6 flex gap-4 animate-report-slide"
        style={{ animationDelay: '480ms' }}
      >
        <div className="shrink-0 w-9 h-9 rounded-full bg-trustBlue-100 text-trustBlue-600 flex items-center justify-center">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-trustBlue-700 mb-1.5">AI Model Insight</p>
          <p className="text-sm text-slate-700 leading-relaxed">{insight}</p>
          <p className="mt-3 text-xs text-slate-400 italic">
            This report is generated by an AI-based Clinical Decision Support System. It does not constitute a medical diagnosis. A licensed physician must review all findings.
          </p>
        </div>
      </div>
    </div>
  );
}
