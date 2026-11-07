import { BellOff } from "lucide-react";

export function NotificationEmptyState({
  title = "No notifications found",
  message = "You're all caught up! New updates across your applications, interviews, and account will appear here.",
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <BellOff size={22} />
      </div>
      <h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-slate-500">{message}</p>
    </div>
  );
}
