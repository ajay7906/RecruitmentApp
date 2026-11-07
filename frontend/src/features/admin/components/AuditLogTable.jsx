import { useState } from "react";
import { AdminDataTable } from "./AdminDataTable";
import { Eye, X } from "lucide-react";

export function AuditLogTable({ logs = [], loading = false, pagination, onPageChange }) {
  const [selectedLog, setSelectedLog] = useState(null);

  const columns = [
    {
      key: "createdAt",
      header: "Timestamp",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">
            {row.actor?.fullName || "System"}
          </p>
          <p className="text-xs text-slate-500">
            {row.actor?.email || row.actorRole || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <span className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
          {row.action}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      render: (row) => (
        <div>
          <span className="text-xs font-bold uppercase text-slate-700">
            {row.entityType}
          </span>
          {row.entityId && (
            <p className="font-mono text-[11px] text-slate-400">
              {String(row.entityId).slice(0, 12)}...
            </p>
          )}
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => (
        <span className="line-clamp-2 max-w-xs text-xs text-slate-600">
          {row.reason || "—"}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">
          {row.ipAddress || "—"}
        </span>
      ),
    },
    {
      key: "details",
      header: "Diff",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedLog(row)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Eye size={13} /> Inspect
        </button>
      ),
    },
  ];

  return (
    <>
      <AdminDataTable
        columns={columns}
        rows={logs}
        loading={loading}
        pagination={pagination}
        onPageChange={onPageChange}
        emptyTitle="No audit log entries match the selected filters"
      />

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                  {selectedLog.action}
                </span>
                <h3 className="mt-1.5 text-base font-bold text-slate-900">
                  Audit Record #{selectedLog.id.slice(0, 8)}
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedLog.createdAt).toLocaleString()} • Actor:{" "}
                  {selectedLog.actor?.fullName || selectedLog.actor?.email || "System"} ({selectedLog.actorRole || "N/A"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">Entity Type & ID</p>
                <p className="mt-1 font-mono text-slate-800">
                  {selectedLog.entityType} / {selectedLog.entityId || "N/A"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">Network Metadata</p>
                <p className="mt-1 font-mono text-slate-800">
                  IP: {selectedLog.ipAddress || "N/A"}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  UA: {selectedLog.userAgent || "N/A"}
                </p>
              </div>
            </div>

            {selectedLog.reason && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="font-semibold text-slate-600">Recorded Reason</p>
                <p className="mt-1 text-slate-800">{selectedLog.reason}</p>
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">Previous Value</p>
                <pre className="max-h-56 overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] text-slate-100">
                  {JSON.stringify(selectedLog.previousValue ?? null, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-600">New Value</p>
                <pre className="max-h-56 overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] text-slate-100">
                  {JSON.stringify(selectedLog.newValue ?? null, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
