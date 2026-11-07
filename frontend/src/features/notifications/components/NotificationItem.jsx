import { Check, MailOpen, Trash2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationCategory } from "./NotificationCategory";

export function NotificationItem({
  notification,
  onMarkRead,
  onMarkUnread,
  onDismiss,
  compact = false,
  onNavigate,
}) {
  const navigate = useNavigate();
  const isUnread = !notification.isRead;

  function handleOpenAction() {
    if (isUnread && onMarkRead) {
      onMarkRead(notification.id);
    }
    if (notification.actionUrl) {
      if (onNavigate) onNavigate();
      navigate(notification.actionUrl);
    }
  }

  return (
    <div
      className={`group relative rounded-xl border transition ${
        isUnread
          ? "border-blue-200 bg-blue-50/40"
          : "border-slate-200 bg-white hover:bg-slate-50/60"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isUnread && (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-brand"
                title="Unread"
              />
            )}
            <NotificationCategory
              category={notification.category}
              compact={compact}
            />
            {notification.channel && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {notification.channel}
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {notification.createdAt
                ? new Date(notification.createdAt).toLocaleString()
                : ""}
            </span>
          </div>

          <h4
            onClick={notification.actionUrl ? handleOpenAction : undefined}
            className={`mt-1.5 font-semibold text-slate-900 ${
              compact ? "text-xs" : "text-sm"
            } ${notification.actionUrl ? "cursor-pointer hover:text-brand" : ""}`}
          >
            {notification.title}
          </h4>

          <p
            className={`mt-0.5 text-slate-600 ${
              compact ? "line-clamp-2 text-xs" : "text-sm"
            }`}
          >
            {notification.message}
          </p>

          {notification.actionUrl && (
            <button
              type="button"
              onClick={handleOpenAction}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              View details <ExternalLink size={12} />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isUnread && onMarkRead && (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              title="Mark as read"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-emerald-600"
            >
              <Check size={15} />
            </button>
          )}
          {!isUnread && onMarkUnread && (
            <button
              type="button"
              onClick={() => onMarkUnread(notification.id)}
              title="Mark as unread"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <MailOpen size={15} />
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(notification.id)}
              title="Dismiss notification"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
