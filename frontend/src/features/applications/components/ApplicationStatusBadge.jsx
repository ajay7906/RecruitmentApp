const STATUS_STYLES = {
  SUBMITTED: {
    label: "Submitted",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    classes: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    classes: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  INTERVIEW: {
    label: "Interview",
    classes: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  OFFERED: {
    label: "Offered",
    classes: "bg-cyan-50 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
  },
  HIRED: {
    label: "Hired",
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    classes: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    classes: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
};

export function ApplicationStatusBadge({ status, size = "md" }) {
  const cfg = STATUS_STYLES[status] || STATUS_STYLES.SUBMITTED;
  const paddingClass =
    size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${paddingClass} ${cfg.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
