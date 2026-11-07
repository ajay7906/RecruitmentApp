import { ChevronLeft, ChevronRight } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import { NotificationEmptyState } from "./NotificationEmptyState";

export function NotificationList({
  notifications = [],
  loading = false,
  pagination = null,
  onPageChange,
  onMarkRead,
  onMarkUnread,
  onDismiss,
  compact = false,
  onNavigate,
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return <NotificationEmptyState />;
  }

  return (
    <div className="space-y-3">
      {notifications.map((n) => (
        <NotificationItem
          key={`${n.channel || "IN_APP"}-${n.id}`}
          notification={n}
          onMarkRead={onMarkRead}
          onMarkUnread={onMarkUnread}
          onDismiss={onDismiss}
          compact={compact}
          onNavigate={onNavigate}
        />
      ))}

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <span>
            Page <strong>{pagination.page}</strong> of{" "}
            <strong>{pagination.totalPages}</strong> ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
