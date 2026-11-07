export function AdminFilters({ filters = [], values = {}, onChange, onReset }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {filters.map((f) => (
        <div key={f.key} className="flex items-center gap-1.5">
          {f.label && (
            <label className="text-xs font-medium text-slate-500">{f.label}:</label>
          )}
          <select
            value={values[f.key] ?? ""}
            onChange={(e) => onChange(f.key, e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none"
          >
            <option value="">{f.placeholder || `All ${f.label || ""}`}</option>
            {(f.options || []).map((opt) => {
              const val = typeof opt === "object" ? opt.value : opt;
              const lbl = typeof opt === "object" ? opt.label : opt;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
        </div>
      ))}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          Reset
        </button>
      )}
    </div>
  );
}
