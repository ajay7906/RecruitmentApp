import { useState, useEffect, useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilters } from "../components/AdminFilters";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { AuditLogTable } from "../components/AuditLogTable";

export function AdminAuditLogsPage() {
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [dateFilter, setDateFilter] = useState({ range: "30d", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], pagination: null });
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listAuditLogs({
        q: q || undefined,
        entityType: entityType || undefined,
        action: action || undefined,
        ...dateFilter,
        page,
        limit: 25,
      });
      setData(res);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [q, entityType, action, dateFilter, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Immutable Security & Audit Logs
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck size={13} /> Append-Only Enforced
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Cryptographically sanitized, tamper-protected administrative trail across users, companies, jobs, roles, and reports.
          </p>
        </div>

        <DateRangeFilter
          range={dateFilter.range}
          from={dateFilter.from}
          to={dateFilter.to}
          onChange={(next) => {
            setDateFilter(next);
            setPage(1);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <AdminSearch
          value={q}
          onChange={(val) => {
            setQ(val);
            setPage(1);
          }}
          placeholder="Search actor name/email, action, entity ID, or reason..."
        />
        <AdminFilters
          values={{ entityType, action }}
          onChange={(key, val) => {
            if (key === "entityType") setEntityType(val);
            if (key === "action") setAction(val);
            setPage(1);
          }}
          onReset={() => {
            setQ("");
            setEntityType("");
            setAction("");
            setPage(1);
          }}
          filters={[
            {
              key: "entityType",
              label: "Entity",
              options: ["USER", "COMPANY", "JOB", "REPORT", "ADMIN_ROLE"],
            },
            {
              key: "action",
              label: "Action",
              options: [
                "USER_SUSPENDED",
                "USER_ACTIVATED",
                "USER_DEACTIVATED",
                "COMPANY_APPROVED",
                "COMPANY_REJECTED",
                "COMPANY_SUSPENDED",
                "JOB_APPROVED",
                "JOB_REJECTED",
                "JOB_CLOSED_BY_ADMIN",
                "ADMIN_ROLE_ASSIGNED",
                "ADMIN_ROLE_CHANGED",
                "ADMIN_USER_PERMISSIONS_UPDATED",
              ],
            },
          ]}
        />
      </div>

      <AuditLogTable
        logs={data.logs || []}
        loading={loading}
        pagination={data.pagination}
        onPageChange={setPage}
      />
    </div>
  );
}
