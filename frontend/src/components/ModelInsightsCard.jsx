import { TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * CLASS_FULL_NAMES — maps short class codes to human-friendly labels.
 * Mirrors CLASS_INFO in app.py so we can display nice names even when the
 * API returns abbreviated codes (e.g. "nv", "mel").
 */
const CLASS_FULL_NAMES = {
  nv:    'Melanocytic Nevi',
  mel:   'Melanoma',
  bcc:   'Basal Cell Carcinoma',
  akiec: 'Actinic Keratosis / Bowen\'s',
  bkl:   'Benign Keratosis',
  df:    'Dermatofibroma',
  vasc:  'Vascular Lesion',
};

/**
 * getRankStyle — returns Tailwind classes for each prediction rank.
 * Rank 0 (top prediction) gets a slightly accented look.
 */
function getRankStyle(rank) {
  if (rank === 0) {
    return {
      row:      'bg-trustBlue-50 border border-trustBlue-100 shadow-sm',
      bar:      'bg-trustBlue-500',
      percent:  'text-trustBlue-700 font-bold',
      name:     'text-slate-900 font-bold',
      badge:    'bg-trustBlue-100 text-trustBlue-700 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
    };
  }
  return {
    row:      'bg-white border border-slate-100',
    bar:      'bg-slate-300',
    percent:  'text-slate-500 font-medium',
    name:     'text-slate-700 font-semibold',
    badge:    null,
  };
}

/** Single prediction row */
function PredictionRow({ label, confidence, rank }) {
  const pct    = (confidence * 100).toFixed(1);
  const style  = getRankStyle(rank);
  const name   = CLASS_FULL_NAMES[label] ?? label;

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 hover:brightness-95 ${style.row}`}
    >
      {/* Rank badge */}
      <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
        {rank + 1}
      </span>

      {/* Class name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm truncate ${style.name}`}>{name}</span>
          {rank === 0 && (
            <span className={style.badge}>Top match</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-1.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${style.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Percentage */}
      <span className={`shrink-0 text-sm tabular-nums ${style.percent}`}>
        {pct}%
      </span>
    </div>
  );
}

/** Warning item row */
function WarningItem({ text }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-amber-800">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <span className="leading-snug">{text}</span>
    </li>
  );
}

/**
 * ModelInsightsCard
 *
 * Props:
 *  topPredictions  — array of [classCode, confidence] pairs  (e.g. [["mel", 0.68], ...])
 *  warnings        — array of warning strings
 *  animationDelay  — optional CSS delay string (e.g. "560ms")
 */
export function ModelInsightsCard({ topPredictions = [], warnings = [], animationDelay = '0ms' }) {
  const hasPredictions = topPredictions.length > 0;
  const hasWarnings    = warnings.length > 0;

  return (
    <div
      className="animate-report-slide"
      style={{ animationDelay }}
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        {/* ── Card header ── */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-trustBlue-100 text-trustBlue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Model Insights</span>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Top Predictions ── */}
          {hasPredictions && (
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Top Predictions
              </h3>
              <div className="space-y-2">
                {topPredictions.slice(0, 3).map(([label, conf], idx) => (
                  <PredictionRow
                    key={label ?? idx}
                    label={label}
                    confidence={conf}
                    rank={idx}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Divider (only when both sections exist) */}
          {hasPredictions && (
            <div className="border-t border-slate-100" />
          )}

          {/* ── Warnings ── */}
          {hasWarnings ? (
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Warnings
              </h3>
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
                <ul className="space-y-2">
                  {warnings.map((w, i) => (
                    <WarningItem key={i} text={w} />
                  ))}
                </ul>
              </div>
            </section>
          ) : (
            <section>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Warnings
              </h3>
              <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="font-medium">No warnings detected</span>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
