import { Activity, ShieldCheck, UserPlus, Building2, BriefcaseBusiness, FileText, CalendarClock } from "lucide-react";

function getActivityIcon(category) {
  switch (category) {
    case "ADMIN_AUDIT":
      return { Icon: ShieldCheck, cls: "bg-purple-50 text-purple-600 border-purple-200" };
    case "USER_REGISTRATION":
      return { Icon: UserPlus, cls: "bg-blue-50 text-blue-600 border-blue-200" };
    case "COMPANY":
      return { Icon: Building2, cls: "bg-emerald-50 text-emerald-600 border-emerald-200" };
    case "JOB":
      return { Icon: BriefcaseBusiness, cls: "bg-indigo-50 text-indigo-600 border-indigo-200" };
    case "APPLICATION":
      return { Icon: FileText, cls: "bg-amber-50 text-amber-600 border-amber-200" };
    case "INTERVIEW":
      return { Icon: CalendarClock, cls: "bg-teal-50 text-teal-600 border-teal-200" };
    default:
      return { Icon: Activity, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  }
}

export function ActivityTimeline({ activities = [], emptyMessage = "No recent platform activity." }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {activities.map((item) => {
        const { Icon, cls } = getActivityIcon(item.category || item.type);
        return (
          <div key={item.id} className="flex items-start gap-3.5 p-4 transition hover:bg-slate-50/60">
            <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${cls}`}>
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <span className="text-xs text-slate-400">
                  {item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}
                </span>
              </div>
              {(item.description || item.reason) && (
                <p className="mt-0.5 text-xs text-slate-600">
                  {item.description || item.reason}
                </p>
              )}
              {item.actor && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Actor: <span className="font-medium text-slate-600">{item.actor.fullName || item.actor.email}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
