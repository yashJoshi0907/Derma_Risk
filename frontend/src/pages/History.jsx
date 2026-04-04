import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import {
  Search, History as HistoryIcon, Activity, User,
  Trash2, AlertCircle, X, ChevronUp, ChevronDown,
  ChevronsUpDown, FilterX,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

const RISK_LEVELS = ['low', 'medium', 'high'];

function riskBadgeClass(risk) {
  switch (risk) {
    case 'high':   return 'bg-softRed-100 text-softRed-700';
    case 'medium': return 'bg-statusAmber-100 text-statusAmber-700';
    case 'low':    return 'bg-sageGreen-100 text-sageGreen-700';
    default:       return 'bg-slate-100 text-slate-600';
  }
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════ */

/* ─── Tooltip ─────────────────────────────────────────────────── */
function Tooltip({ label, children }) {
  return (
    <div className="relative group/tip inline-flex">
      {children}
      <span className="
        pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2
        whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1
        text-[11px] font-medium text-white shadow-lg
        opacity-0 scale-95 translate-y-1
        group-hover/tip:opacity-100 group-hover/tip:scale-100 group-hover/tip:translate-y-0
        transition-all duration-150 ease-out z-50
      ">
        {label}
        <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
      </span>
    </div>
  );
}

/* ─── Confirm Dialog ──────────────────────────────────────────── */
function ConfirmDialog({ open, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm mx-4 p-6 animate-confirm-in">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">Delete Patient Record</h3>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete this patient record? This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Trash2 className="w-4 h-4" />}
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Error Toast ─────────────────────────────────────────────── */
function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-xl shadow-xl animate-toast-in max-w-sm">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Filter Select ───────────────────────────────────────────── */
function FilterSelect({ value, onChange, options, label }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="
          appearance-none h-9 pl-3 pr-8 rounded-lg border border-slate-200
          bg-white text-slate-700 text-sm font-medium
          focus:outline-none focus:ring-2 focus:ring-trustBlue-300 focus:border-trustBlue-400
          hover:border-slate-300 transition-colors cursor-pointer
          shadow-sm
        "
      >
        {options.map(({ value: v, label: l }) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      {/* Custom chevron */}
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
    </div>
  );
}

/* ─── Sortable Column Header ──────────────────────────────────── */
function SortHeader({ label, field, sortField, sortDir, onSort, className = '' }) {
  const active = sortField === field;
  return (
    <th
      className={`py-4 px-6 cursor-pointer select-none group ${className}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1 text-slate-600 group-hover:text-trustBlue-700 transition-colors">
        {label}
        <span className="text-slate-300 group-hover:text-trustBlue-400 transition-colors">
          {active
            ? (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)
            : <ChevronsUpDown className="w-3.5 h-3.5" />}
        </span>
      </span>
    </th>
  );
}

/* ─── Risk Legend ─────────────────────────────────────────────── */
function RiskLegend() {
  const items = [
    { color: 'bg-sageGreen-400',    label: 'Low Risk'    },
    { color: 'bg-statusAmber-400',  label: 'Medium Risk' },
    { color: 'bg-softRed-400',      label: 'High Risk'   },
  ];
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map(({ color, label }) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export function History() {
  const navigate = useNavigate();

  /* ── Data ── */
  const [cases, setCases]   = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Filters ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [riskFilter, setRiskFilter]     = useState('all');

  /* ── Sorting ── */
  const [sortField, setSortField] = useState('timestamp');
  const [sortDir, setSortDir]     = useState('desc');

  /* ── Delete ── */
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── Toast ── */
  const [toast, setToast] = useState(null);

  /* ── Fetch ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/history?limit=50');
        setCases(res.data.predictions || []);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Active filter check ── */
  const hasActiveFilters = searchQuery || genderFilter !== 'all' || riskFilter !== 'all';

  /* ── Clear filters ── */
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setGenderFilter('all');
    setRiskFilter('all');
  }, []);

  /* ── Sort handler ── */
  const handleSort = useCallback((field) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return field;
    });
  }, []);

  /* ── Filter + Sort pipeline ── */
  const processedCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = cases.filter((c) => {
      const name   = (c.patient_name || c.metadata?.patient_name || '').toLowerCase();
      const lesion = (c.full_name || '').toLowerCase();
      const risk   = (c.risk_level || '').toLowerCase();
      const sex    = (c.metadata?.sex || '').toLowerCase();

      const matchSearch = !q || name.includes(q) || lesion.includes(q) || risk.includes(q);
      const matchGender =
        genderFilter === 'all' ||
        (genderFilter === 'male'   && sex === 'male')   ||
        (genderFilter === 'female' && sex === 'female');
      const matchRisk =
        riskFilter === 'all' || risk === riskFilter;

      return matchSearch && matchGender && matchRisk;
    });

    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'patient_name') {
        aVal = (a.patient_name || a.metadata?.patient_name || '').toLowerCase();
        bVal = (b.patient_name || b.metadata?.patient_name || '').toLowerCase();
      } else if (sortField === 'timestamp') {
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
      } else if (sortField === 'confidence') {
        aVal = a.confidence ?? 0;
        bVal = b.confidence ?? 0;
      } else {
        return 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

    return sorted;
  }, [cases, searchQuery, genderFilter, riskFilter, sortField, sortDir]);

  /* ── Delete handlers ── */
  const handleDeleteClick  = (id) => setDeleteTarget(id);
  const handleDeleteCancel = () => { if (!deleteLoading) setDeleteTarget(null); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/history/${deleteTarget}`);
      setCases((prev) => prev.filter((c) => c.prediction_id !== deleteTarget));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed', err);
      setToast('Failed to delete the record. Please try again.');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  /* ══════════════════════════════════
     RENDER
  ══════════════════════════════════ */
  return (
    <>
      {/* ── Keyframes ── */}
      <style>{`
        @keyframes confirmIn {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .animate-confirm-in { animation: confirmIn 0.18s ease-out both; }
        .animate-toast-in   { animation: toastIn   0.20s ease-out both; }
      `}</style>

      <div className="space-y-6 max-w-6xl mx-auto">

        {/* ── Page header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <HistoryIcon className="w-6 h-6 text-trustBlue-900" />
              Patient Case History
            </h1>
            <p className="text-slate-500 mt-1">Review longitudinal data of past skin lesion screenings.</p>
          </div>
          {/* Risk Legend — top right on wide screens */}
          {!loading && cases.length > 0 && (
            <RiskLegend />
          )}
        </div>

        <Card>
          {/* ── Card Header: Search + Filters ── */}
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 space-y-3">
            {/* Row 1: Title + filter controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800 shrink-0">Screening Database</h2>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search by patient, lesion type, or risk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 w-64 text-sm"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Gender filter */}
                <FilterSelect
                  label="Filter by gender"
                  value={genderFilter}
                  onChange={setGenderFilter}
                  options={[
                    { value: 'all',    label: 'All Genders' },
                    { value: 'male',   label: 'Male'        },
                    { value: 'female', label: 'Female'      },
                  ]}
                />

                {/* Risk filter */}
                <FilterSelect
                  label="Filter by risk"
                  value={riskFilter}
                  onChange={setRiskFilter}
                  options={[
                    { value: 'all',    label: 'All Risk Levels' },
                    { value: 'low',    label: 'Low Risk'        },
                    { value: 'medium', label: 'Medium Risk'     },
                    { value: 'high',   label: 'High Risk'       },
                  ]}
                />

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="
                      inline-flex items-center gap-1.5 h-9 px-3 rounded-lg
                      text-sm font-medium text-slate-500
                      border border-slate-200 bg-white
                      hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50
                      transition-all duration-150
                    "
                  >
                    <FilterX className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Result count */}
            {!loading && (
              <p className="text-xs text-slate-400 font-medium">
                {hasActiveFilters
                  ? <>Showing <span className="text-trustBlue-600 font-semibold">{processedCases.length}</span> of <span className="font-semibold text-slate-600">{cases.length}</span> cases</>
                  : <><span className="font-semibold text-slate-600">{cases.length}</span> total case{cases.length !== 1 ? 's' : ''}</>
                }
              </p>
            )}
          </CardHeader>

          {/* ── Table / States ── */}
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-trustBlue-900" />
              </div>
            ) : processedCases.length === 0 ? (
              /* ── Empty State ── */
              <div className="p-14 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-5">
                  {hasActiveFilters
                    ? <FilterX className="w-7 h-7 text-slate-400" />
                    : <Activity className="w-7 h-7 text-slate-400" />}
                </div>
                <p className="text-lg font-semibold text-slate-700">
                  {hasActiveFilters ? 'No matching cases found' : 'No cases found'}
                </p>
                <p className="mt-1.5 text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {hasActiveFilters
                    ? 'Try adjusting your search or filters to see results.'
                    : 'Your screening database is empty. Initiate a new case to see history.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-trustBlue-600 hover:text-trustBlue-800 transition-colors"
                  >
                    <FilterX className="w-4 h-4" />
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold">
                    <tr>
                      {/* Sortable columns */}
                      <SortHeader
                        label={<span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Patient Name</span>}
                        field="patient_name"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <SortHeader
                        label="Timestamp"
                        field="timestamp"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      {/* Non-sortable */}
                      <th className="py-4 px-6 text-slate-600">Case Summary (Prediction)</th>
                      <th className="py-4 px-6 text-slate-600">Risk Protocol</th>
                      <SortHeader
                        label="Confidence Score"
                        field="confidence"
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                      <th className="py-4 px-6 text-slate-600">Record Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {processedCases.map((c) => {
                      const patientName = c.patient_name || c.metadata?.patient_name || '—';
                      return (
                        <tr key={c.prediction_id} className="hover:bg-trustBlue-50/30 transition-colors">

                          {/* Patient Name */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-trustBlue-100 text-trustBlue-700 flex items-center justify-center shrink-0 text-xs font-bold">
                                {patientName !== '—' ? patientName.charAt(0).toUpperCase() : '?'}
                              </div>
                              <span className="font-medium text-slate-900">{patientName}</span>
                            </div>
                          </td>

                          {/* Timestamp */}
                          <td className="py-4 px-6 text-slate-600">
                            {new Date(c.timestamp).toLocaleString()}
                          </td>

                          {/* Diagnosis */}
                          <td className="py-4 px-6 font-medium text-slate-900">
                            {c.full_name || 'Unknown Diagnosis'}
                            <div className="text-xs font-normal mt-0.5 text-slate-500">
                              {c.metadata?.location || 'Unknown Location'} •{' '}
                              {c.metadata?.age ? `${c.metadata.age}yo` : ''} {c.metadata?.sex || ''}
                            </div>
                          </td>

                          {/* Risk */}
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase ${riskBadgeClass(c.risk_level)}`}>
                              {c.risk_level} Risk
                            </span>
                          </td>

                          {/* Confidence */}
                          <td className="py-4 px-6 text-slate-600">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${c.confidence >= 0.8 ? 'bg-trustBlue-600' : 'bg-trustBlue-400'}`}
                                  style={{ width: `${c.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">
                                {(c.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-end gap-3">
                              <Tooltip label="View Report">
                                <button
                                  aria-label="View Report"
                                  onClick={() => navigate('/dashboard/report', { state: { reportData: c } })}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all duration-200"
                                >
                                  <Search className="w-4 h-4" />
                                </button>
                              </Tooltip>

                              <Tooltip label="Delete">
                                <button
                                  aria-label="Delete Record"
                                  onClick={() => handleDeleteClick(c.prediction_id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 hover:scale-110 transition-all duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={deleteLoading}
      />

      {/* ── Error Toast ── */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
