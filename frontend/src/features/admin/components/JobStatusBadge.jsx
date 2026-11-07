export function JobStatusBadge({ status, moderationStatus }) {
  const normalized = String(status || "DRAFT").toUpperCase();
  const styles = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
    UNDER_REVIEW: "bg-orange-50 text-orange-700 border-orange-200",
    APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
    PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PAUSED: "bg-amber-100 text-amber-800 border-amber-200",
    CLOSED: "bg-slate-200 text-slate-700 border-slate-300",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
    EXPIRED: "bg-slate-100 text-slate-600 border-slate-200",
    ARCHIVED: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
          styles[normalized] || styles.DRAFT
        }`}
      >
        {normalized.replace(/_/g, " ")}
      </span>
      {moderationStatus && moderationStatus !== "CLEARED" && moderationStatus !== "NOT_REVIEWED" && (
        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
          {moderationStatus.replace(/_/g, " ")}
        </span>
      )}
    </div>
  );
}
