import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, Settings, History, Inbox, Search } from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "../api/notificationsApi";
import { NotificationList } from "./NotificationList";

const CATEGORIES = [
  "ALL",
  "APPLICATION",
  "INTERVIEW",
  "HIRING",
  "JOB",
  "COMPANY",
  "ACCOUNT",
  "SECURITY",
  "ADMIN",
  "SYSTEM",
];

export function NotificationCenter() {
  const [activeTab, setActiveTab] = useState("inbox"); // "inbox" | "history"
  const [category, setCategory] = useState("ALL");
  const [readFilter, setReadFilter] = useState("ALL"); // "ALL" | "false" | "true"
  const [channelFilter, setChannelFilter] = useState("ALL"); // "ALL" | "IN_APP" | "EMAIL"
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({
    notifications: [],
    unreadCount: 0,
    pagination: null,
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "history") {
        const res = await notificationsApi.getHistory({
          channel: channelFilter,
          category,
          page,
          limit: 15,
        });
        setData({
          notifications: res?.items || [],
          unreadCount: 0,
          pagination: res?.pagination || null,
        });
      } else {
        const res = await notificationsApi.listNotifications({
          category,
          isRead: readFilter === "ALL" ? undefined : readFilter,
          q: q.trim() || undefined,
          page,
          limit: 15,
        });
        setData({
          notifications: res?.notifications || [],
          unreadCount: res?.unreadCount ?? 0,
          pagination: res?.pagination || null,
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [activeTab, category, readFilter, channelFilter, q, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleMarkRead(id) {
    try {
      await notificationsApi.markAsRead(id);
      loadData();
    } catch {
      toast.error("Failed to mark notification as read");
    }
  }

  async function handleMarkUnread(id) {
    try {
      await notificationsApi.markAsUnread(id);
      loadData();
    } catch {
      toast.error("Failed to mark notification as unread");
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllAsRead(category);
      toast.success("Notifications marked as read");
      loadData();
    } catch {
      toast.error("Failed to mark all notifications as read");
    }
  }

  async function handleDismiss(id) {
    try {
      await notificationsApi.dismissNotification(id);
      toast.success("Notification dismissed");
      loadData();
    } catch {
      toast.error("Failed to dismiss notification");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Notification Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View real-time application, interview, company, and security alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === "inbox" && data.unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <CheckCheck size={15} /> Mark All Read ({data.unreadCount})
            </button>
          )}
          <Link
            to="/app/notification-settings"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Settings size={15} /> Notification Preferences
          </Link>
        </div>
      </div>

      {/* Mode Tabs: Active Inbox vs Full Channel History */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("inbox");
              setPage(1);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "inbox"
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Inbox size={14} /> Active Inbox
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              setPage(1);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "history"
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <History size={14} /> Complete Delivery History (In-App & Email)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "inbox" ? (
            <>
              <div className="relative">
                <Search
                  size={14}
                  className=" absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search notifications..."
                  className="rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-brand focus:outline-none"
                />
              </div>
              <select
                value={readFilter}
                onChange={(e) => {
                  setReadFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="false">Unread Only</option>
                <option value="true">Read Only</option>
              </select>
            </>
          ) : (
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Channels (In-App + Email)</option>
              <option value="IN_APP">In-App Only</option>
              <option value="EMAIL">Email Only</option>
            </select>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCategory(cat);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              category === cat
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {cat === "ALL" ? "All Categories" : cat}
          </button>
        ))}
      </div>

      <NotificationList
        notifications={data.notifications}
        loading={loading}
        pagination={data.pagination}
        onPageChange={setPage}
        onMarkRead={activeTab === "inbox" ? handleMarkRead : undefined}
        onMarkUnread={activeTab === "inbox" ? handleMarkUnread : undefined}
        onDismiss={activeTab === "inbox" ? handleDismiss : undefined}
      />
    </div>
  );
}
