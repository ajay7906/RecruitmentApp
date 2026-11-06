import {
  employmentTypeOptions,
  workModeOptions,
  jobStatusOptions,
} from "../schema/jobSchemas";

const selectClass =
  "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-brand focus:bg-white";

export function JobFilters({
  filters,
  onChange,
  companies = [],
  showStatusFilter = true,
  showCompanyFilter = true,
  showSort = true,
}) {
  function update(key, val) {
    onChange({ ...filters, [key]: val });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showCompanyFilter && companies.length > 0 && (
        <select
          value={filters.companyId || "ALL"}
          onChange={(e) => update("companyId", e.target.value)}
          className={selectClass}
        >
          <option value="ALL">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {showStatusFilter && (
        <select
          value={filters.status || "ALL"}
          onChange={(e) => update("status", e.target.value)}
          className={selectClass}
        >
          <option value="ALL">All statuses</option>
          {jobStatusOptions.map((st) => (
            <option key={st} value={st}>
              {st.replace("_", " ")}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.employmentType || "ALL"}
        onChange={(e) => update("employmentType", e.target.value)}
        className={selectClass}
      >
        <option value="ALL">All types</option>
        {employmentTypeOptions.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select
        value={filters.workMode || "ALL"}
        onChange={(e) => update("workMode", e.target.value)}
        className={selectClass}
      >
        <option value="ALL">All work modes</option>
        {workModeOptions.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={filters.location || ""}
        onChange={(e) => update("location", e.target.value)}
        placeholder="Filter city/country..."
        className={`${selectClass} w-36`}
      />

      {showSort && (
        <select
          value={`${filters.sortBy || "createdAt"}:${filters.sortOrder || "desc"}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split(":");
            onChange({ ...filters, sortBy, sortOrder });
          }}
          className={selectClass}
        >
          <option value="createdAt:desc">Newest created</option>
          <option value="createdAt:asc">Oldest created</option>
          <option value="publishedAt:desc">Recently published</option>
          <option value="applicationDeadline:asc">Deadline soonest</option>
        </select>
      )}
    </div>
  );
}
