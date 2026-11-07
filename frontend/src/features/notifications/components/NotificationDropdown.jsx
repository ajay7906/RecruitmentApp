import { Link } from "react-router-dom";
import { CheckCheck, Settings, ArrowRight } from "lucide-react";
import { NotificationList } from "./NotificationList";

export function NotificationDropdown({
  notifications = [],
  unreadCount = 0,
  loading = false,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClose,
  centerPath = "/app/notifications",
  settingsPath = "/app/notification-settings",
}) {
  return (
    <div className="absolute right-0 top-12 z-50 w-96 max-w-[92vw] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
          <p className="text-xs text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
          <Link
            to={settingsPath}
            onClick={onClose}
            title="Notification preferences"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Settings size={15} />
          </Link>
        </div>
      </div>

      <div className="my-3 max-h-96 overflow-y-auto pr-1">
        <NotificationList
          notifications={notifications}
          loading={loading}
          onMarkRead={onMarkRead}
          onDismiss={onDismiss}
          compact={true}
          onNavigate={onClose}
        />
      </div>

      <div className="border-t border-slate-100 pt-3 text-center">
        <Link
          to={centerPath}
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
        >
          Open Notification Center <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
