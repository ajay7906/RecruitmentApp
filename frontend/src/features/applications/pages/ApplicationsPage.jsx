import { FileText } from "lucide-react";

export function ApplicationsPage() {
  return (
    <div>
      <p className="text-sm font-medium text-brand">YOUR JOB SEARCH</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-950">Applications</h1>
      <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <FileText className="mx-auto text-slate-400" size={30} />
        <h2 className="mt-3 font-semibold text-slate-900">Application tracking comes next</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Connect this screen after confirming your backend application endpoints and response schema. Avoid mock statuses that could be mistaken for real application data.</p>
      </div>
    </div>
  );
}
