import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export function ProfileCompletion({ completion, onNavigateTab }) {
  if (!completion) return null;

  const {
    percentage = 0,
    completedCount = 0,
    totalSections = 8,
    sections = [],
    missingSections = [],
  } = completion;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">
              Profile Completion
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                percentage >= 80
                  ? "bg-emerald-50 text-emerald-700"
                  : percentage >= 50
                  ? "bg-blue-50 text-brand"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              {percentage}%
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {completedCount} of {totalSections} profile sections completed.
            Complete your profile and upload a primary resume to stand out to
            recruiters.
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>

      {/* Section Pills */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sections.map((sec) => (
          <button
            key={sec.key}
            type="button"
            onClick={() => onNavigateTab && onNavigateTab(sec.targetTab)}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
              sec.completed
                ? "border-emerald-200 bg-emerald-50/50 text-emerald-900 hover:bg-emerald-50"
                : "border-amber-200 bg-amber-50/40 text-amber-900 hover:bg-amber-50"
            }`}
          >
            <span className="flex items-center gap-1.5 font-medium truncate">
              {sec.completed ? (
                <CheckCircle2
                  size={14}
                  className="shrink-0 text-emerald-600"
                />
              ) : (
                <AlertCircle size={14} className="shrink-0 text-amber-600" />
              )}
              <span className="truncate">{sec.label}</span>
            </span>
            <span className="ml-1 shrink-0 text-[11px] font-semibold opacity-70">
              +{sec.weight}%
            </span>
          </button>
        ))}
      </div>

      {/* Next Action Prompt */}
      {missingSections.length > 0 && onNavigateTab && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
          <span>
            <strong className="text-slate-800">Next recommended step:</strong>{" "}
            {missingSections[0].hint}
          </span>
          <button
            type="button"
            onClick={() => onNavigateTab(missingSections[0].targetTab)}
            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
          >
            Complete {missingSections[0].label}
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
