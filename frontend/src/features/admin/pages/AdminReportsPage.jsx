import { useState, useEffect, useCallback } from "react";
import { Eye, Flag, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilters } from "../components/AdminFilters";
import { AdminDataTable } from "../components/AdminDataTable";
import { ReportDetails } from "../components/ReportDetails";
import { ReportsCenterPage } from "../../notifications/pages/ReportsCenterPage";
import { useAuthStore } from "../../../stores/authStore";

const STATUS_BADGE = {
  OPEN: "bg-rose-50 text-rose-700 border-rose-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISMISSED: "bg-slate-100 text-slate-600 border-slate-200",
};

export function AdminReportsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage =
    user?.adminRole === "SUPER_ADMIN" ||
    !Array.isArray(user?.permissions) ||
    user.permissions.includes("reports.manage");

  const [activeView, setActiveView] = useState("moderation");
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ reports: [], counts: {}, pagination: null });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [repRes, admRes] = await Promise.all([
        adminApi.listReports({
          q: q || undefined,
          entityType: entityType || undefined,
          status: statusFilter || undefined,
          page,
          limit: 20,
        }),
        adminApi.listAdministrators().catch(() => ({ administrators: [] })),
      ]);
      setData(repRes);
      setAdmins(admRes?.administrators || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load moderation reports");
    } finally {
      setLoading(false);
    }
  }, [q, entityType, statusFilter, page]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function openReport(id) {
    try {
      const details = await adminApi.getReportDetails(id);
      setSelectedReport(details);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load report details");
    }
  }

  async function handleUpdateStatus(payload) {
    if (!selectedReport) return;
    try {
      const updated = await adminApi.updateReportStatus(selectedReport.id, payload);
      setSelectedReport(updated);
      toast.success("Report status updated");
      loadReports();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update report");
    }
  }

  async function handleAssign(payload) {
    if (!selectedReport) return;
    try {
      const updated = await adminApi.assignReport(selectedReport.id, payload);
      setSelectedReport(updated);
      toast.success("Report assignment updated");
      loadReports();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to assign report");
    }
  }

  async function handleAddNote(payload) {
    if (!selectedReport) return;
    try {
      const updated = await adminApi.addReportNote(selectedReport.id, payload);
      setSelectedReport(updated);
      toast.success("Investigation note added");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add note");
    }
  }

  const columns = [
    {
      key: "entityType",
      header: "Type",
      render: (row) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
          {row.entityType}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason & Description",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.reason}</p>
          {row.description && (
            <p className="line-clamp-1 max-w-sm text-xs text-slate-500">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "reporter",
      header: "Reporter",
      render: (row) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{row.reporter?.fullName || "User"}</p>
          <p className="text-slate-500">{row.reporter?.email}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            STATUS_BADGE[row.status] || STATUS_BADGE.OPEN
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "assigned",
      header: "Assigned To",
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.assignedAdmin?.fullName || "Unassigned"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Reported",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <button
          type="button"
          onClick={() => openReport(row.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Eye size={13} /> Review ({row._count?.notes ?? 0})
        </button>
      ),
    },
  ];

  const counts = data.counts || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reports, Exports & Moderation Queue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate and export live platform reports (CSV, Excel, JSON) or investigate flagged content reports.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveView("moderation")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeView === "moderation"
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Flag size={14} /> Moderation Queue ({counts.OPEN ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveView("business")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeView === "business"
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileSpreadsheet size={14} /> Business Reports & Export
          </button>
        </div>
      </div>

      {activeView === "business" ? (
        <ReportsCenterPage embedded={true} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
        {[
          { key: "", label: `All (${counts.ALL ?? 0})` },
          { key: "OPEN", label: `Open (${counts.OPEN ?? 0})` },
          { key: "UNDER_REVIEW", label: `Under Review (${counts.UNDER_REVIEW ?? 0})` },
          { key: "RESOLVED", label: `Resolved (${counts.RESOLVED ?? 0})` },
          { key: "DISMISSED", label: `Dismissed (${counts.DISMISSED ?? 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === tab.key
                ? "border-brand bg-brand text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <AdminSearch
          value={q}
          onChange={(val) => {
            setQ(val);
            setPage(1);
          }}
          placeholder="Search report reason, description, reporter..."
        />
        <AdminFilters
          values={{ entityType }}
          onChange={(_, val) => {
            setEntityType(val);
            setPage(1);
          }}
          onReset={() => {
            setQ("");
            setEntityType("");
            setStatusFilter("");
            setPage(1);
          }}
          filters={[
            {
              key: "entityType",
              label: "Entity Type",
              options: ["JOB", "COMPANY", "USER"],
            },
          ]}
        />
      </div>

      <AdminDataTable
        columns={columns}
        rows={data.reports || []}
        loading={loading}
        pagination={data.pagination}
        onPageChange={setPage}
      />

      {selectedReport && (
        <ReportDetails
          report={selectedReport}
          administrators={admins}
          canManage={canManage}
          onClose={() => setSelectedReport(null)}
          onUpdateStatus={handleUpdateStatus}
          onAssign={handleAssign}
          onAddNote={handleAddNote}
        />
      )}
        </>
      )}
    </div>
  );
}
