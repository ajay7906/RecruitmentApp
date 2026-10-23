import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { jobsApi } from "../api/jobsApi";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";

export function JobsPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["jobs", { search }],
    queryFn: () => jobsApi.list(search ? { search } : {}),
    retry: false,
  });

  const payload = query.data;
  const jobs = Array.isArray(payload) ? payload : payload?.jobs || payload?.data?.jobs || [];

  return (
    <div>
      <div className="mb-7"><p className="text-sm font-medium text-brand">OPPORTUNITIES</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Find jobs</h1><p className="mt-2 text-slate-500">Search opportunities from your connected backend.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); query.refetch(); }} className="mb-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <Search className="ml-2 mt-2.5 text-slate-400" size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search job titles or keywords" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none" /><button className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>
      {query.isPending ? <LoadingState title="Loading jobs" /> : query.isError ? <ErrorState title="Jobs API needs connecting" message={query.error?.response?.data?.message || "Update the endpoint in src/features/jobs/api/jobsApi.js."} onRetry={query.refetch} /> : jobs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BriefcaseBusiness className="mx-auto text-slate-400" size={28} /><h2 className="mt-3 font-semibold text-slate-900">No jobs found</h2><p className="mt-1 text-sm text-slate-500">There are no matching jobs in the API response yet.</p></div> : <div className="grid gap-4 md:grid-cols-2">{jobs.map((job) => <article key={job.id || job._id} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">{job.title || job.jobTitle || "Untitled position"}</h2><p className="mt-1 text-sm text-slate-500">{job.company?.name || job.companyName || "Company"}</p><p className="mt-3 flex items-center gap-1 text-sm text-slate-500"><MapPin size={15} />{job.location || "Location not specified"}</p>{job.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{job.description}</p>}</article>)}</div>}
    </div>
  );
}
