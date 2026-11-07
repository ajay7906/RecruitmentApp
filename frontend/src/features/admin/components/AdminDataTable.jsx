import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdminDataTable({
  columns = [],
  rows = [],
  keyField = "id",
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filter criteria.",
  pagination,
  onPageChange,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key || col.header}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                    col.className || ""
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center"
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {emptyTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {emptyDescription}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr
                  key={row[keyField] || rowIdx}
                  className="transition hover:bg-slate-50/70"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key || col.header}
                      className={`px-4 py-3.5 align-middle text-slate-700 ${
                        col.cellClassName || ""
                      }`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          <p className="text-xs text-slate-500">
            Showing page <span className="font-semibold text-slate-800">{pagination.page}</span> of{" "}
            <span className="font-semibold text-slate-800">{pagination.totalPages}</span> (
            {pagination.total} total)
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
