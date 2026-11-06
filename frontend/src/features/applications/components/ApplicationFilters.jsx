import { RotateCcw } from "lucide-react";
import { APPLICATION_STATUSES, APPLICATION_STATUS_META } from "../schema/applicationSchemas";

export function ApplicationFilters({
  mode = "candidate",
  filters,
  onChange,
  onReset,
  companies = [],
  jobs = [],
}) {
  const selectClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-brand focus:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Status filter */}
      <select
        value={filters.status || ""}
        onChange={(e) => onChange({ status: e.target.value })}
        className={selectClass}
        aria-label="Filter by application status"
      >
        <option value="">All Statuses</option>
        {APPLICATION_STATUSES.map((st) => (
          <option key={st} value={st}>
            {APPLICATION_STATUS_META[st]?.label || st}
          </option>
        ))}
      </select>

      {/* Company filter */}
      {mode === "candidate" ? (
        <input
          type="text"
          value={filters.company || ""}
          onChange={(e) => onChange({ company: e.target.value })}
          placeholder="Filter by company..."
          className={selectClass}
        />
      ) : (
        companies.length > 0 && (
          <select
            value={filters.companyId || ""}
            onChange={(e) =>
              onChange({ companyId: e.target.value, jobId: "" })
            }
            className={selectClass}
            aria-label="Filter by company"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )
      )}

      {/* Recruiter specific filters */}
      {mode === "recruiter" && (
        <>
          {jobs.length > 0 && (
            <select
              value={filters.jobId || ""}
              onChange={(e) => onChange({ jobId: e.target.value })}
              className={selectClass}
              aria-label="Filter by job"
            >
              <option value="">All Jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            value={filters.skill || ""}
            onChange={(e) => onChange({ skill: e.target.value })}
            placeholder="Skills (e.g. React, Node)..."
            className={selectClass}
          />

          <input
            type="number"
            min="0"
            max="50"
            step="0.5"
            value={filters.minExperience ?? ""}
            onChange={(e) => onChange({ minExperience: e.target.value })}
            placeholder="Min Exp (yrs)"
            className={`${selectClass} w-28`}
          />
        </>
      )}

      {/* Applied Date Filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-400">From:</span>
        <input
          type="date"
          value={filters.appliedFrom || ""}
          onChange={(e) => onChange({ appliedFrom: e.target.value })}
          className={selectClass}
        />
      </div>

      {/* Sort */}
      <select
        value={`${filters.sortBy || "appliedAt"}:${filters.sortOrder || "desc"}`}
        onChange={(e) => {
          const [sortBy, sortOrder] = e.target.value.split(":");
          onChange({ sortBy, sortOrder });
        }}
        className={selectClass}
        aria-label="Sort applications"
      >
        <option value="appliedAt:desc">Latest Applications</option>
        <option value="appliedAt:asc">Oldest Applications</option>
        <option value="lastStatusUpdatedAt:desc">Recently Updated</option>
        {mode === "recruiter" && (
          <option value="candidateExperience:desc">Highest Experience</option>
        )}
      </select>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
      >
        <RotateCcw size={13} />
        Reset
      </button>
    </div>
  );
}
