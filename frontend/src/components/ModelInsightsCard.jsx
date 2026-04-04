import { AlertTriangle, ShieldCheck } from 'lucide-react';

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
 * ModelInsightsCard — warnings only.
 *
 * Props:
 *  warnings        — array of warning strings
 *  animationDelay  — optional CSS delay string (e.g. "480ms")
 */
export function ModelInsightsCard({ warnings = [], animationDelay = '0ms' }) {
  const hasWarnings = warnings.length > 0;

  return (
    <div className="animate-report-slide" style={{ animationDelay }}>
      {hasWarnings ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-6 py-5">
          <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings
          </h3>
          <ul className="space-y-2">
            {warnings.map((w, i) => (
              <WarningItem key={i} text={w} />
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-medium">No warnings detected</span>
        </div>
      )}
    </div>
  );
}
