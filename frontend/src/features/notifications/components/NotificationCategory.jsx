import {
  UserCheck,
  Building2,
  BriefcaseBusiness,
  FileText,
  CalendarClock,
  Award,
  Bell,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

const CATEGORY_CONFIG = {
  ACCOUNT: {
    label: "Account",
    icon: UserCheck,
    style: "bg-blue-50 text-blue-700 border-blue-200",
  },
  COMPANY: {
    label: "Company",
    icon: Building2,
    style: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  JOB: {
    label: "Job",
    icon: BriefcaseBusiness,
    style: "bg-sky-50 text-sky-700 border-sky-200",
  },
  APPLICATION: {
    label: "Application",
    icon: FileText,
    style: "bg-purple-50 text-purple-700 border-purple-200",
  },
  INTERVIEW: {
    label: "Interview",
    icon: CalendarClock,
    style: "bg-amber-50 text-amber-800 border-amber-200",
  },
  HIRING: {
    label: "Hiring",
    icon: Award,
    style: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  SECURITY: {
    label: "Security",
    icon: ShieldAlert,
    style: "bg-rose-50 text-rose-700 border-rose-200",
  },
  ADMIN: {
    label: "Admin",
    icon: ShieldCheck,
    style: "bg-slate-900 text-white border-slate-800",
  },
  SYSTEM: {
    label: "System",
    icon: Bell,
    style: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function NotificationCategory({ category = "SYSTEM", compact = false }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.SYSTEM;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${cfg.style} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <Icon size={compact ? 11 : 13} />
      {cfg.label}
    </span>
  );
}
