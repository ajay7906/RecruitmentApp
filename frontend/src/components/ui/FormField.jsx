import { forwardRef } from "react";

export const FormField = forwardRef(function FormField({ label, error, className = "", ...props }, ref) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <input ref={ref} aria-invalid={Boolean(error)} className={`mt-2 w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${error ? "border-red-300 focus:border-red-400 focus:ring-red-50" : "border-slate-200 focus:border-brand focus:ring-blue-100"}`} {...props} />
      {error && <span className="mt-1.5 block text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
});
