import { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const Button = forwardRef(function Button({ className, variant = "primary", ...props }, ref) {
  const styles = {
    primary: "bg-brand text-white hover:bg-blue-700 focus-visible:ring-blue-200",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-200",
    ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-200",
  };
  return <button ref={ref} className={twMerge(clsx("inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60", styles[variant] || styles.primary, className))} {...props} />;
});
