import { Star, FileText, CheckCircle2 } from "lucide-react";
import { formatFileSize } from "../../applications/schema/applicationSchemas";

export function PrimaryResumeSelector({
  resumes = [],
  selectedResumeId,
  onSelect,
  label = "Select Resume",
}) {
  if (!resumes || resumes.length === 0) return null;

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold text-slate-700">{label}</p>
      )}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {resumes.map((r) => {
          const isSelected = selectedResumeId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                isSelected
                  ? "border-brand bg-blue-50/60 ring-2 ring-blue-500/15"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-brand">
                  <FileText size={17} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-slate-900">
                      {r.title || r.originalFileName}
                    </p>
                    {r.isPrimary && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                        <Star size={9} className="fill-white" /> Primary
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-slate-500">
                    {r.originalFileName} · v{r.version || 1} ·{" "}
                    {formatFileSize(r.fileSize)}
                  </p>
                </div>
              </div>
              <CheckCircle2
                size={17}
                className={
                  isSelected ? "shrink-0 text-brand" : "shrink-0 text-slate-200"
                }
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
