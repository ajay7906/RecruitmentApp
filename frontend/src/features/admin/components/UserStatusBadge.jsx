const ROLES = {
  SUPER_ADMIN: {
    label: "Super Admin",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
  ADMIN: {
    label: "Platform Admin",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  MODERATOR: {
    label: "Moderator",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  SUPPORT_ADMIN: {
    label: "Support Admin",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
  },
  JOB_APPROVER: {
    label: "Job Approver",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
};

export function AdminRoleBadge({ role }) {
  const meta = ROLES[role] || {
    label: role || "Admin",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

export function UserStatusBadge({ status }) {
  const normalized = String(status || "ACTIVE").toUpperCase();
  const styles = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SUSPENDED: "bg-rose-50 text-rose-700 border-rose-200",
    INACTIVE: "bg-slate-100 text-slate-700 border-slate-300",
    PENDING_VERIFICATION: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const labels = {
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    INACTIVE: "Inactive",
    PENDING_VERIFICATION: "Pending Verification",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        styles[normalized] || styles.ACTIVE
      }`}
    >
      {labels[normalized] || normalized}
    </span>
  );
}
