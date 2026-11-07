export function CompanyStatusBadge({ status }) {
  const normalized = String(status || "DRAFT").toUpperCase();
  const styles = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
    SUSPENDED: "bg-red-100 text-red-800 border-red-200",
  };
  const labels = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    SUSPENDED: "Suspended",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        styles[normalized] || styles.DRAFT
      }`}
    >
      {labels[normalized] || normalized}
    </span>
  );
}
