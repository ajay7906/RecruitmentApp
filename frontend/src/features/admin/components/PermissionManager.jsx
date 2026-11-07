import { useMemo } from "react";
import { Check, Lock } from "lucide-react";

export function PermissionManager({
  catalog = [],
  selectedPermissions = [],
  onToggle,
  readOnly = false,
}) {
  const grouped = useMemo(() => {
    const map = {};
    for (const item of catalog) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return Object.entries(map);
  }, [catalog]);

  const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);

  return (
    <div className="space-y-5">
      {grouped.map(([category, items]) => (
        <div
          key={category}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {category}
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.map((perm) => {
              const checked = selectedSet.has(perm.key);
              return (
                <label
                  key={perm.key}
                  className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                    checked
                      ? "border-blue-200 bg-blue-50/40"
                      : "border-slate-200 bg-slate-50/40"
                  } ${readOnly ? "cursor-default" : "cursor-pointer hover:border-slate-300"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={readOnly}
                    onChange={() => !readOnly && onToggle?.(perm.key)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {perm.label}
                      </span>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                        {perm.key}
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {perm.description}
                    </p>
                  </div>
                  {readOnly && checked && (
                    <Lock size={13} className="mt-0.5 text-slate-400" />
                  )}
                  {!readOnly && checked && (
                    <Check size={14} className="mt-0.5 text-brand" />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
