export function LoadingState({ title = "Loading" }) {
  return <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8"><div className="h-4 w-36 animate-pulse rounded bg-slate-200" /><p className="mt-4 text-sm text-slate-500">{title}...</p></div>;
}
