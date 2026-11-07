import { Link } from "react-router-dom";
import { ArrowLeft, BellRing } from "lucide-react";
import { NotificationPreferences } from "../components/NotificationPreferences";

export function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/app/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={14} /> Back to Notification Center
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
            <BellRing size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Notification Preferences
            </h1>
            <p className="text-sm text-slate-500">
              Control which updates you receive by Email and In-App notifications.
            </p>
          </div>
        </div>
      </div>

      <NotificationPreferences />
    </div>
  );
}
