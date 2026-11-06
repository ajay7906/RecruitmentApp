import {
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ShieldCheck,
  Crown,
  UserCheck,
} from "lucide-react";

const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    icon: FileEdit,
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    icon: Clock,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
  },
  SUSPENDED: {
    label: "Suspended",
    icon: Ban,
    className: "border-rose-200 bg-rose-100 text-rose-800",
  },
};

const ROLE_CONFIG = {
  OWNER: {
    label: "Owner",
    icon: Crown,
    className: "border-purple-200 bg-purple-50 text-purple-700",
  },
  ADMIN: {
    label: "Admin",
    icon: ShieldCheck,
    className: "border-blue-200 bg-blue-50 text-brand",
  },
  RECRUITER: {
    label: "Recruiter",
    icon: UserCheck,
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

export function CompanyStatusBadge({ status = "DRAFT", size = "md" }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-0.5 text-xs gap-1"
      : "px-3 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${sizeClasses} ${cfg.className}`}
    >
      <Icon size={size === "sm" ? 12 : 14} />
      {cfg.label}
    </span>
  );
}

export function CompanyRoleBadge({ role }) {
  if (!role) return null;
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.RECRUITER;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}
