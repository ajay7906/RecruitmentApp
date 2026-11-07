import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "../api/notificationsApi";
import { NotificationBadge } from "./NotificationBadge";
import { NotificationDropdown } from "./NotificationDropdown";
import { useAuthStore } from "../../../stores/authStore";

export function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const isAdmin = user?.role === "admin";
  const centerPath = isAdmin ? "/admin/notifications" : "/app/notifications";
  const settingsPath = "/app/notification-settings";

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res?.unreadCount ?? 0);
    } catch {
      // Non-critical background poll
    }
  }, [user]);

  const fetchDropdownNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationsApi.listNotifications({ page: 1, limit: 6 });
      setItems(res?.notifications || []);
      setUnreadCount(res?.unreadCount ?? 0);
    } catch {
      // Ignore dropdown load error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 45_000);
    return () => clearInterval(timer);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) {
      fetchDropdownNotifications();
    }
  }, [open, fetchDropdownNotifications]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  async function handleMarkRead(id) {
    try {
      await notificationsApi.markAsRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error("Could not mark notification as read");
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllAsRead("ALL");
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Could not mark notifications as read");
    }
  }

  async function handleDismiss(id) {
    try {
      await notificationsApi.dismissNotification(id);
      const target = items.find((n) => n.id === id);
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      toast.error("Could not dismiss notification");
    }
  }

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open notifications"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1">
            <NotificationBadge count={unreadCount} />
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={items}
          unreadCount={unreadCount}
          loading={loading}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onDismiss={handleDismiss}
          onClose={() => setOpen(false)}
          centerPath={centerPath}
          settingsPath={settingsPath}
        />
      )}
    </div>
  );
}
