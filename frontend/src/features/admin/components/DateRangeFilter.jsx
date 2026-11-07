import { Calendar } from "lucide-react";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "custom", label: "Custom" },
];

export function DateRangeFilter({
  range = "30d",
  from = "",
  to = "",
  onChange,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1">
        <Calendar size={14} className="mx-2 text-slate-400" />
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange({ range: preset.value, from, to })}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              range === preset.value
                ? "bg-brand text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={from}
            onChange={(e) => onChange({ range: "custom", from: e.target.value, to })}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onChange({ range: "custom", from, to: e.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          />
        </div>
      )}
    </div>
  );
}
