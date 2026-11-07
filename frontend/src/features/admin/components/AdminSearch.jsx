import { Search, X } from "lucide-react";

export function AdminSearch({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative flex-1 min-w-[220px]">
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
