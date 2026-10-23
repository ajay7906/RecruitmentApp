import { AlertCircle, RefreshCw } from "lucide-react";

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return <section role="alert" className="rounded-2xl border border-red-200 bg-white p-6"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0 text-red-500" size={20} /><div><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>{onRetry && <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand"><RefreshCw size={15} /> Try again</button>}</div></div></section>;
}
