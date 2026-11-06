import { Search, X } from "lucide-react";

export function JobSearch({
  value,
  onChange,
  placeholder = "Search job titles, departments, keywords...",
}) {
  return (
    <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-brand focus-within:bg-white">
      <Search size={17} className="shrink-0 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
