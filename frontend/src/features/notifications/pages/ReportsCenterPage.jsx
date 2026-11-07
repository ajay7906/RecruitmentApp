import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  FileSpreadsheet,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "../api/notificationsApi";
import { DateRangeFilter } from "../../admin/components/DateRangeFilter";

export function ReportsCenterPage({ embedded = false, defaultCompanyId = "" }) {
  const params = useParams();
  const initialCompanyId = defaultCompanyId || params.id || "";

  const [catalog, setCatalog] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [dateFilter, setDateFilter] = useState({ range: "all", from: "", to: "" });
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [employmentType, setEmploymentType] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [page, setPage] = useState(1);

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingFormat, setExportingFormat] = useState("");

  useEffect(() => {
    let mounted = true;
    notificationsApi
      .listAvailableReports()
      .then((res) => {
        if (!mounted) return;
        const list = res?.reports || [];
        setCatalog(list);
        if (list.length > 0 && !selectedType) {
          setSelectedType(list[0].type);
        }
      })
      .catch(() => {
        toast.error("Failed to load available report types");
      });
    return () => {
      mounted = false;
    };
  }, [selectedType]);

  const buildFilterParams = useCallback(
    (includePagination = true) => {
      const p = {
        range: dateFilter.range || "all",
        from: dateFilter.from || undefined,
        to: dateFilter.to || undefined,
        q: q.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        companyId: companyId || undefined,
        employmentType: employmentType || undefined,
        workMode: workMode || undefined,
        decision: decisionFilter || undefined,
      };
      if (includePagination) {
        p.page = page;
        p.limit = 20;
      }
      return p;
    },
    [
      dateFilter,
      q,
      roleFilter,
      statusFilter,
      companyId,
      employmentType,
      workMode,
      decisionFilter,
      page,
    ]
  );

  const loadReport = useCallback(async () => {
    if (!selectedType) return;
    setLoading(true);
    try {
      const res = await notificationsApi.getReport(
        selectedType,
        buildFilterParams(true)
      );
      setReportData(res);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [selectedType, buildFilterParams]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  async function handleExport(format) {
    if (!selectedType) return;
    setExportingFormat(format);
    try {
      const res = await notificationsApi.exportReport(selectedType, {
        ...buildFilterParams(false),
        format,
      });
      toast.success(`Exported ${res.fileName}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Report export failed");
    } finally {
      setExportingFormat("");
    }
  }

  const currentDef =
    catalog.find((c) => c.type === selectedType) || reportData || {};
  const availableFilters = currentDef.availableFilters || [];
  const columns = reportData?.columns || currentDef.columns || [];
  const rows = reportData?.rows || [];
  const pagination = reportData?.pagination || null;

  function formatCell(val) {
    if (val === null || val === undefined || val === "") return "—";
    if (
      typeof val === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)
    ) {
      return new Date(val).toLocaleString();
    }
    return String(val);
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Reports & Data Export Center
              </h1>
              <p className="text-sm text-slate-500">
                Generate live reports from database records and export filtered datasets to CSV, Excel, or JSON.
              </p>
            </div>
          </div>

          <DateRangeFilter
            range={dateFilter.range}
            from={dateFilter.from}
            to={dateFilter.to}
            onChange={(val) => {
              setDateFilter(val);
              setPage(1);
            }}
          />
        </div>
      )}

      {/* Report Type Selector Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap gap-2">
          {catalog.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => {
                setSelectedType(item.type);
                setStatusFilter("");
                setRoleFilter("");
                setPage(1);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                selectedType === item.type
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={Boolean(exportingFormat) || loading}
            onClick={() => handleExport("csv")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Download size={14} />
            {exportingFormat === "csv" ? "Exporting..." : "Export CSV"}
          </button>
          <button
            type="button"
            disabled={Boolean(exportingFormat) || loading}
            onClick={() => handleExport("xlsx")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={14} />
            {exportingFormat === "xlsx" ? "Exporting..." : "Export Excel"}
          </button>
          <button
            type="button"
            disabled={Boolean(exportingFormat) || loading}
            onClick={() => handleExport("json")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Dynamic Contextual Filter Bar (only displays filters relevant to selected report) */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {availableFilters.includes("q") && (
          <div className="relative min-w-[220px] flex-1">
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
              placeholder={`Search ${currentDef.title || "report"}...`}
              className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-xs focus:border-brand focus:outline-none"
            />
          </div>
        )}

        {availableFilters.includes("role") && (
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="">All Roles</option>
            <option value="candidate">Candidate</option>
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin</option>
          </select>
        )}

        {availableFilters.includes("status") && (
          <input
            type="text"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by status (e.g. PUBLISHED, APPROVED)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
          />
        )}

        {availableFilters.includes("employmentType") && (
          <select
            value={employmentType}
            onChange={(e) => {
              setEmploymentType(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="">All Employment Types</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
        )}

        {availableFilters.includes("workMode") && (
          <select
            value={workMode}
            onChange={(e) => {
              setWorkMode(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="">All Work Modes</option>
            <option value="Onsite">Onsite</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        )}

        {availableFilters.includes("decision") && (
          <select
            value={decisionFilter}
            onChange={(e) => {
              setDecisionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option value="">All Hiring Outcomes</option>
            <option value="SELECTED">Selected</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="REJECTED">Rejected</option>
          </select>
        )}
      </div>

      {/* Report Data Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">
            {reportData?.title || "Report Results"}
          </h2>
          <p className="text-xs text-slate-500">
            {reportData?.description || ""}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-bold">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={Math.max(1, columns.length)}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Loading report records...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, columns.length)}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 font-medium text-slate-800"
                      >
                        {formatCell(row[col.key])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
            <span>
              Page <strong>{pagination.page}</strong> of{" "}
              <strong>{pagination.totalPages}</strong> ({pagination.total} total records)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold hover:bg-slate-50 disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
