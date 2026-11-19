import { Pagination } from "../../../components/ui/Pagination";

export function AdminDataTable({
  columns = [],
  rows = [],
  keyField = "id",
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filter criteria.",
  pagination,
  onPageChange,
  onLimitChange,
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

      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalRecords={pagination.total}
          pageSize={pagination.limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          loading={loading}
          className="bg-slate-50/60"
        />
      )}
    </div>
  );
}
