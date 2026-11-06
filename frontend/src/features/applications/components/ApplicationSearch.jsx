import { Search, X } from "lucide-react";

export function ApplicationSearch({
  value,
  onChange,
  placeholder = "Search by job title or company...",
}) {
  return (
    <div className="relative flex-1">
      <Search
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-500/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
