import {
  FileText,
  Send,
  Clock,
  Star,
  Calendar,
  Award,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export function ApplicationStatistics({
  stats = {},
  activeStatus = "",
  onSelectStatus,
  mode = "candidate",
}) {
  const cards = [
    {
      key: "",
      label: "Total Applications",
      value: stats.total ?? 0,
      icon: FileText,
      tone: "bg-slate-100 text-slate-700",
    },
    {
      key: "SUBMITTED",
      label: mode === "recruiter" ? "New Applications" : "Submitted",
      value: stats.SUBMITTED ?? 0,
      icon: Send,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      key: "UNDER_REVIEW",
      label: "Under Review",
      value: stats.UNDER_REVIEW ?? 0,
      icon: Clock,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      key: "SHORTLISTED",
      label: "Shortlisted",
      value: stats.SHORTLISTED ?? 0,
      icon: Star,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      key: "INTERVIEW",
      label: mode === "recruiter" ? "Interviews" : "Interview",
      value: stats.INTERVIEW ?? 0,
      icon: Calendar,
      tone: "bg-purple-50 text-purple-700",
    },
    {
      key: "OFFERED",
      label: mode === "recruiter" ? "Offers" : "Offered",
      value: stats.OFFERED ?? 0,
      icon: Award,
      tone: "bg-cyan-50 text-cyan-700",
    },
    {
      key: "HIRED",
      label: "Hired",
      value: stats.HIRED ?? 0,
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      key: "REJECTED",
      label: "Rejected",
      value: stats.REJECTED ?? 0,
      icon: XCircle,
      tone: "bg-red-50 text-red-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 xl:grid-cols-8">
      {cards.map(({ key, label, value, icon: Icon, tone }) => {
        const isSelected = activeStatus === key;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelectStatus && onSelectStatus(key)}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
              isSelected
                ? "border-brand bg-blue-50/50 ring-2 ring-blue-500/15"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}
              >
                <Icon size={17} />
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {label}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
