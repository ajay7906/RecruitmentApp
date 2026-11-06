import {
  FileEdit,
  Clock,
  CheckCircle2,
  PauseCircle,
  Lock,
  XCircle,
  CalendarOff,
  Archive,
  ShieldAlert,
  ShieldCheck,
  Flag,
} from "lucide-react";

const JOB_STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    icon: FileEdit,
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
  PUBLISHED: {
    label: "Published",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  PAUSED: {
    label: "Paused",
    icon: PauseCircle,
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  CLOSED: {
    label: "Closed",
    icon: Lock,
    className: "border-slate-300 bg-slate-200 text-slate-800",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
  },
  EXPIRED: {
    label: "Expired",
    icon: CalendarOff,
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  ARCHIVED: {
    label: "Archived",
    icon: Archive,
    className: "border-slate-200 bg-slate-50 text-slate-500",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    icon: ShieldAlert,
    className: "border-amber-300 bg-amber-50 text-amber-800",
  },
  PENDING_APPROVAL: {
    label: "Under Review",
    icon: Clock,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
};

const MODERATION_STATUS_CONFIG = {
  NOT_REVIEWED: {
    label: "Auto-Check Pending",
    icon: Clock,
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
  FLAGGED: {
    label: "Flagged",
    icon: Flag,
    className: "border-amber-300 bg-amber-50 text-amber-800",
  },
  UNDER_REVIEW: {
    label: "Under Moderation",
    icon: ShieldAlert,
    className: "border-orange-300 bg-orange-50 text-orange-800",
  },
  ACTION_REQUIRED: {
    label: "Action Required",
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
  },
  CLEARED: {
    label: "Cleared",
    icon: ShieldCheck,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

export function JobStatusBadge({ status = "DRAFT", size = "md" }) {
  const cfg = JOB_STATUS_CONFIG[status] || JOB_STATUS_CONFIG.DRAFT;
  const Icon = cfg.icon;
  const sizeClass =
    size === "sm"
      ? "px-2.5 py-0.5 text-xs gap-1"
      : "px-3 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${sizeClass} ${cfg.className}`}
    >
      <Icon size={size === "sm" ? 12 : 14} />
      {cfg.label}
    </span>
  );
}

export function JobModerationBadge({
  moderationStatus = "NOT_REVIEWED",
  size = "sm",
}) {
  const cfg =
    MODERATION_STATUS_CONFIG[moderationStatus] ||
    MODERATION_STATUS_CONFIG.NOT_REVIEWED;
  const Icon = cfg.icon;
  const sizeClass =
    size === "sm"
      ? "px-2.5 py-0.5 text-xs gap-1"
      : "px-3 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${sizeClass} ${cfg.className}`}
    >
      <Icon size={size === "sm" ? 12 : 14} />
      {cfg.label}
    </span>
  );
}
