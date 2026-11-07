import { useState, useEffect, useCallback } from "react";
import {
  MailCheck,
  AlertOctagon,
  Clock,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "../api/notificationsApi";
import { AdminStatCard } from "../../admin/components/AdminStatCard";
import { AdminDataTable } from "../../admin/components/AdminDataTable";
import { useAuthStore } from "../../../stores/authStore";

const STATUS_BADGE = {
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
};

export function AdminNotificationMonitoringPage() {
  const user = useAuthStore((s) => s.user);
  const canRetry =
    user?.adminRole === "SUPER_ADMIN" ||
    !Array.isArray(user?.permissions) ||
    user.permissions.includes("notifications.manage");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({
    deliveries: [],
    summary: { total: 0, SENT: 0, FAILED: 0, PENDING: 0, PROCESSING: 0 },
    pagination: null,
  });
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState("");

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.listAdminDeliveries({
        status: statusFilter,
        category: categoryFilter,
        q: q.trim() || undefined,
        page,
        limit: 20,
      });
      setData(res);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to load notification deliveries"
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, q, page]);

  useEffect(() => {
    loadDeliveries();
  }, [loadDeliveries]);

  async function handleRetry(id) {
    setRetryingId(id);
    try {
      await notificationsApi.retryAdminDelivery(id);
      toast.success("Email delivery retry executed");
      loadDeliveries();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Retry attempt failed");
    } finally {
      setRetryingId("");
    }
  }

  const columns = [
    {
      key: "status",
      header: "Delivery Status",
      render: (row) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
            STATUS_BADGE[row.status] || "bg-slate-100 text-slate-700"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "recipientEmail",
      header: "Recipient",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.recipientEmail}</p>
          <p className="text-xs text-slate-500">
            {row.recipient?.fullName || "User"} ({row.recipient?.role || "external"})
          </p>
        </div>
      ),
    },
    {
      key: "eventType",
      header: "Event & Subject",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.subject}</p>
          <p className="text-xs text-slate-500">
            {row.category} • {row.eventType}
          </p>
        </div>
      ),
    },
    {
      key: "attempts",
      header: "Attempts & Failure Info",
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-700">
            {row.attemptCount} / {row.maxAttempts} attempts ({row.provider})
          </p>
          {row.failureReason && (
            <p className="mt-0.5 max-w-xs truncate text-xs text-rose-600" title={row.failureReason}>
              {row.failureReason}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created / Sent",
      render: (row) => (
        <div className="text-xs text-slate-500">
          <p>Created: {new Date(row.createdAt).toLocaleString()}</p>
          {row.sentAt && <p>Sent: {new Date(row.sentAt).toLocaleString()}</p>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (row) =>
        canRetry && row.status === "FAILED" ? (
          <button
            type="button"
            disabled={retryingId === row.id}
            onClick={() => handleRetry(row.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <RotateCcw size={13} />
            {retryingId === row.id ? "Retrying..." : "Retry"}
          </button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  const sum = data.summary || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Notification & Email Delivery Monitoring
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor asynchronous email processing status, provider responses, failure reasons, and retry queues.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total Email Deliveries"
          value={sum.total ?? 0}
          subtext="Tracked across all platform events"
          icon={MailCheck}
          tone="blue"
        />
        <AdminStatCard
          label="Delivered (SENT)"
          value={sum.SENT ?? 0}
          subtext="Accepted by mail transport"
          icon={MailCheck}
          tone="emerald"
        />
        <AdminStatCard
          label="Pending / Processing"
          value={(sum.PENDING ?? 0) + (sum.PROCESSING ?? 0)}
          subtext="Queued for dispatch"
          icon={Clock}
          tone="amber"
        />
        <AdminStatCard
          label="Failed Deliveries"
          value={sum.FAILED ?? 0}
          subtext="Eligible for bounded retry"
          icon={AlertOctagon}
          tone="rose"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative min-w-[240px] flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search recipient email, subject, or event type..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-xs focus:border-brand focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="ALL">All Delivery Statuses</option>
          <option value="SENT">SENT</option>
          <option value="FAILED">FAILED</option>
          <option value="PENDING">PENDING</option>
          <option value="PROCESSING">PROCESSING</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="ALL">All Categories</option>
          <option value="SECURITY">SECURITY</option>
          <option value="ACCOUNT">ACCOUNT</option>
          <option value="COMPANY">COMPANY</option>
          <option value="JOB">JOB</option>
          <option value="APPLICATION">APPLICATION</option>
          <option value="INTERVIEW">INTERVIEW</option>
          <option value="HIRING">HIRING</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      <AdminDataTable
        columns={columns}
        rows={data.deliveries || []}
        loading={loading}
        pagination={data.pagination}
        onPageChange={setPage}
        emptyMessage="No email delivery records match the current filters."
      />
    </div>
  );
}
