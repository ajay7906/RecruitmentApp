import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Reusable, responsive pagination component for all data tables and lists.
 * Supports page navigation, page numbers with smart ellipsis windowing,
 * configurable page sizes (10, 25, 50, 100), range display, and loading state.
 */
export function Pagination({
  currentPage = 1,
  page,
  totalPages = 1,
  totalRecords = 0,
  total,
  pageSize = 10,
  limit,
  onPageChange,
  onPageSizeChange,
  onLimitChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = true,
  showRecordRange = true,
  showJumpToFirstLast = true,
  loading = false,
  className = "",
}) {
  // Normalize prop aliases
  const activePage = Math.max(1, page ?? currentPage ?? 1);
  const normalizedTotalRecords = total ?? totalRecords ?? 0;
  const activePageSize = limit ?? pageSize ?? 10;
  const calculatedTotalPages = Math.max(
    1,
    totalPages || Math.ceil(normalizedTotalRecords / activePageSize) || 1
  );
  const handlePageSizeChange = onLimitChange || onPageSizeChange;

  // Calculate record display range
  const startRecord =
    normalizedTotalRecords === 0
      ? 0
      : (activePage - 1) * activePageSize + 1;
  const endRecord = Math.min(activePage * activePageSize, normalizedTotalRecords);

  const isFirstPage = activePage <= 1;
  const isLastPage = activePage >= calculatedTotalPages;

  const handlePageClick = (p) => {
    if (loading || p === activePage || p < 1 || p > calculatedTotalPages) return;
    onPageChange?.(p);
  };

  const handleSelectPageSize = (e) => {
    const newSize = Number(e.target.value);
    if (newSize === activePageSize) return;
    handlePageSizeChange?.(newSize);
    onPageChange?.(1);
  };

  // Build page window with ellipsis
  const getPageNumbers = () => {
    if (calculatedTotalPages <= 7) {
      return Array.from({ length: calculatedTotalPages }, (_, i) => i + 1);
    }

    if (activePage <= 4) {
      return [1, 2, 3, 4, 5, "...", calculatedTotalPages];
    }

    if (activePage >= calculatedTotalPages - 3) {
      return [
        1,
        "...",
        calculatedTotalPages - 4,
        calculatedTotalPages - 3,
        calculatedTotalPages - 2,
        calculatedTotalPages - 1,
        calculatedTotalPages,
      ];
    }

    return [
      1,
      "...",
      activePage - 1,
      activePage,
      activePage + 1,
      "...",
      calculatedTotalPages,
    ];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 bg-white ${className}`}
      aria-label="Pagination Navigation"
    >
      {/* Left side: Record range & Page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        {showRecordRange && (
          <span className="font-medium text-slate-600">
            Showing{" "}
            <span className="font-semibold text-slate-900">{startRecord}</span>
            –
            <span className="font-semibold text-slate-900">{endRecord}</span> of{" "}
            <span className="font-semibold text-slate-900">
              {normalizedTotalRecords}
            </span>{" "}
            records
          </span>
        )}

        {showPageSize && handlePageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <label htmlFor="pagination-page-size" className="text-slate-500 whitespace-nowrap">
              Show:
            </label>
            <select
              id="pagination-page-size"
              value={activePageSize}
              onChange={handleSelectPageSize}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/20 disabled:opacity-50"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}

        {calculatedTotalPages > 1 && (
          <span className="text-slate-400">
            (Page <span className="font-semibold text-slate-700">{activePage}</span> of{" "}
            <span className="font-semibold text-slate-700">{calculatedTotalPages}</span>)
          </span>
        )}
      </div>

      {/* Right side: Page navigation buttons */}
      <div className="flex items-center gap-1 self-center sm:self-auto">
        {/* Jump to first page */}
        {showJumpToFirstLast && calculatedTotalPages > 5 && (
          <button
            type="button"
            title="First page"
            aria-label="First page"
            disabled={isFirstPage || loading}
            onClick={() => handlePageClick(1)}
            className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsLeft size={14} />
          </button>
        )}

        {/* Previous page */}
        <button
          type="button"
          aria-label="Previous page"
          disabled={isFirstPage || loading}
          onClick={() => handlePageClick(activePage - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
          <span className="hidden xs:inline">Prev</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((num, idx) => {
            if (num === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-1 text-xs text-slate-400 select-none"
                >
                  …
                </span>
              );
            }

            const isCurrent = num === activePage;
            return (
              <button
                key={num}
                type="button"
                aria-label={`Page ${num}`}
                aria-current={isCurrent ? "page" : undefined}
                disabled={loading}
                onClick={() => handlePageClick(num)}
                className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                  isCurrent
                    ? "bg-brand text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Next page */}
        <button
          type="button"
          aria-label="Next page"
          disabled={isLastPage || loading}
          onClick={() => handlePageClick(activePage + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="hidden xs:inline">Next</span>
          <ChevronRight size={14} />
        </button>

        {/* Jump to last page */}
        {showJumpToFirstLast && calculatedTotalPages > 5 && (
          <button
            type="button"
            title="Last page"
            aria-label="Last page"
            disabled={isLastPage || loading}
            onClick={() => handlePageClick(calculatedTotalPages)}
            className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
