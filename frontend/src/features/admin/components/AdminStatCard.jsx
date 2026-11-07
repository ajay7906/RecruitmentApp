import { Link } from "react-router-dom";

const TONE_MAP = {
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

export function AdminStatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "blue",
  to,
}) {
  const toneClass = TONE_MAP[tone] || TONE_MAP.blue;

  const content = (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {value ?? 0}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-slate-500">{subtext}</p>
        )}
      </div>
      {Icon && (
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${toneClass}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
