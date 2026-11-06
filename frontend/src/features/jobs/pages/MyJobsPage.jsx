import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BriefcaseBusiness,
  Plus,
  LayoutGrid,
  List,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import { companiesApi } from "../../companies/api/companiesApi";
import { JobSearch } from "../components/JobSearch";
import { JobFilters } from "../components/JobFilters";
import { JobCard } from "../components/JobCard";
import { JobTable } from "../components/JobTable";
import { ConfirmDialog } from "../../companies/components/ConfirmDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

export function MyJobsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    companyId: "ALL",
    status: "ALL",
    employmentType: "ALL",
    workMode: "ALL",
    location: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState({ action: null, job: null });

  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedLocation = useDebouncedValue(filters.location, 300);

  const companiesQuery = useQuery({
    queryKey: ["companies", "my-select"],
    queryFn: () => companiesApi.getMyCompanies({ limit: 50 }),
  });

  const jobsQuery = useQuery({
    queryKey: [
      "jobs",
      "my-list",
      {
        q: debouncedSearch,
        ...filters,
        location: debouncedLocation,
        page,
      },
    ],
    queryFn: () =>
      jobsApi.getMyJobs({
        q: debouncedSearch || undefined,
        companyId: filters.companyId !== "ALL" ? filters.companyId : undefined,
        status: filters.status !== "ALL" ? filters.status : undefined,
        employmentType:
          filters.employmentType !== "ALL" ? filters.employmentType : undefined,
        workMode: filters.workMode !== "ALL" ? filters.workMode : undefined,
        location: debouncedLocation || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page,
        limit: 10,
      }),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, job }) => {
      if (action === "publish") {
        const submitForApproval =
          job.company?.status !== "APPROVED" || Boolean(job.requireAdminApproval);
        return jobsApi.publishJob(job.id, { submitForApproval });
      }
      if (action === "pause") return jobsApi.pauseJob(job.id);
      if (action === "resume") return jobsApi.resumeJob(job.id);
      if (action === "close") return jobsApi.closeJob(job.id);
      if (action === "archive") return jobsApi.archiveJob(job.id);
      if (action === "delete") return jobsApi.deleteJob(job.id);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(res?.data?.message || "Job updated!");
      setDialog({ action: null, job: null });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Action failed.");
      setDialog({ action: null, job: null });
    },
  });

  const companies =
    companiesQuery.data?.data?.companies ??
    companiesQuery.data?.companies ??
    [];
  const jobs = jobsQuery.data?.data?.jobs ?? jobsQuery.data?.jobs ?? [];
  const pagination = jobsQuery.data?.data?.pagination ?? {
    total: jobs.length,
    page: 1,
    totalPages: 1,
  };

  function handleAction(action, job) {
    if (action === "pause" || action === "resume") {
      actionMutation.mutate({ action, job });
      return;
    }
    setDialog({ action, job });
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand">JOB LISTINGS</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">My Jobs</h1>
          <p className="mt-2 text-slate-500">
            Browse and manage all job openings across your associated companies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/app/jobs/manage"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LayoutDashboard size={16} />
            Job Dashboard
          </Link>
          <Link
            to="/app/jobs/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-blue-700"
          >
            <Plus size={17} />
            Create Job
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <JobSearch
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "grid"
                  ? "bg-white text-brand shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "table"
                  ? "bg-white text-brand shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        <JobFilters
          filters={filters}
          companies={companies}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
      </div>

      {jobsQuery.isPending ? (
        <LoadingState title="Loading jobs" />
      ) : jobsQuery.isError ? (
        <ErrorState
          title="Could not load jobs"
          message={
            jobsQuery.error?.response?.data?.message || "Failed to load jobs."
          }
          onRetry={jobsQuery.refetch}
        />
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BriefcaseBusiness className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-3 font-semibold text-slate-900">No jobs found</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a new job vacancy or adjust your filters.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              mode="recruiter"
              onAction={handleAction}
            />
          ))}
        </div>
      ) : (
        <JobTable jobs={jobs} onAction={handleAction} />
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
          <p>
            Page <span className="font-semibold">{pagination.page}</span> of{" "}
            <span className="font-semibold">{pagination.totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1 px-3 py-2 text-xs"
            >
              <ChevronLeft size={14} /> Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1 px-3 py-2 text-xs"
            >
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(dialog.action && dialog.job)}
        title={`Confirm ${dialog.action} job?`}
        description={`Are you sure you want to ${dialog.action} "${dialog.job?.title}"?`}
        confirmLabel="Confirm"
        variant={
          dialog.action === "delete" || dialog.action === "close"
            ? "danger"
            : "primary"
        }
        isPending={actionMutation.isPending}
        onClose={() => setDialog({ action: null, job: null })}
        onConfirm={() =>
          dialog.action &&
          dialog.job &&
          actionMutation.mutate({ action: dialog.action, job: dialog.job })
        }
      />
    </div>
  );
}
