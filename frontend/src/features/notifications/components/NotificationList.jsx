import { NotificationItem } from "./NotificationItem";
import { NotificationEmptyState } from "./NotificationEmptyState";
import { Pagination } from "../../../components/ui/Pagination";

export function NotificationList({
  notifications = [],
  loading = false,
  pagination = null,
  onPageChange,
  onLimitChange,
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

      {pagination && onPageChange && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalRecords={pagination.total}
            pageSize={pagination.limit}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
