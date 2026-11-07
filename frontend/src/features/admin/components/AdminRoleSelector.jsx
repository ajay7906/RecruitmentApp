const ADMIN_ROLES_INFO = [
  {
    value: "SUPER_ADMIN",
    label: "Super Admin",
    description: "Unrestricted platform governance, role configuration, and security control.",
  },
  {
    value: "ADMIN",
    label: "Platform Admin",
    description: "Manage users, companies, jobs, applications, reports, analytics, and audit logs.",
  },
  {
    value: "MODERATOR",
    label: "Moderator",
    description: "Review and act on company registrations, job flags, and user reports.",
  },
  {
    value: "SUPPORT_ADMIN",
    label: "Support Admin",
    description: "Assist users, verify accounts, inspect applications, and handle support reports.",
  },
  {
    value: "JOB_APPROVER",
    label: "Job Approver",
    description: "Focused review, approval, rejection, and flagging of job postings.",
  },
];

export function AdminRoleSelector({ value, onChange, allowSuperAdmin = false, disabled = false }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {ADMIN_ROLES_INFO.map((role) => {
        const isLocked = role.value === "SUPER_ADMIN" && !allowSuperAdmin;
        const selected = value === role.value;
        return (
          <button
            key={role.value}
            type="button"
            disabled={disabled || isLocked}
            onClick={() => onChange(role.value)}
            className={`rounded-xl border p-3.5 text-left transition ${
              selected
                ? "border-brand bg-blue-50/70 ring-1 ring-brand"
                : "border-slate-200 bg-white hover:border-slate-300"
            } ${(disabled || isLocked) ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">{role.label}</span>
              <span className="font-mono text-[10px] text-slate-400">{role.value}</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">{role.description}</p>
          </button>
        );
      })}
    </div>
  );
}
