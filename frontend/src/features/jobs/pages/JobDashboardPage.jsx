import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BriefcaseBusiness,
  Plus,
  CheckCircle2,
  FileEdit,
  Clock,
  PauseCircle,
  Lock,
  Users2,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import { companiesApi } from "../../companies/api/companiesApi";
import { JobSearch } from "../components/JobSearch";
import { JobFilters } from "../components/JobFilters";
import { JobTable } from "../components/JobTable";
import { ConfirmDialog } from "../../companies/components/ConfirmDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

export function JobDashboardPage() {
  const queryClient = useQueryClient();
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
      "my",
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
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success(res?.data?.message || res?.message || "Job updated!");
      setDialog({ action: null, job: null });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Could not complete action on job."
      );
      setDialog({ action: null, job: null });
    },
  });

  const companies =
    companiesQuery.data?.data?.companies ??
    companiesQuery.data?.companies ??
    [];
  const jobs = jobsQuery.data?.data?.jobs ?? jobsQuery.data?.jobs ?? [];
  const stats = jobsQuery.data?.data?.stats ?? {
    totalJobs: 0,
    publishedJobs: 0,
    draftJobs: 0,
    pendingApprovalJobs: 0,
    pausedJobs: 0,
    closedJobs: 0,
    activeVacancies: 0,
  };
  const pagination = jobsQuery.data?.data?.pagination ?? {
    total: jobs.length,
    page: 1,
    totalPages: 1,
  };

  const kpiCards = [
    {
      label: "Total Jobs",
      value: stats.totalJobs,
      icon: BriefcaseBusiness,
      color: "bg-blue-50 text-brand",
      filterStatus: "ALL",
    },
    {
      label: "Published Jobs",
      value: stats.publishedJobs,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
      filterStatus: "PUBLISHED",
    },
    {
      label: "Draft Jobs",
      value: stats.draftJobs,
      icon: FileEdit,
      color: "bg-slate-100 text-slate-700",
      filterStatus: "DRAFT",
    },
    {
      label: "Pending Approval",
      value: stats.pendingApprovalJobs,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      filterStatus: "PENDING_APPROVAL",
    },
    {
      label: "Paused Jobs",
      value: stats.pausedJobs,
      icon: PauseCircle,
      color: "bg-orange-50 text-orange-600",
      filterStatus: "PAUSED",
    },
    {
      label: "Closed Jobs",
      value: stats.closedJobs,
      icon: Lock,
      color: "bg-slate-200 text-slate-800",
      filterStatus: "CLOSED",
    },
    {
      label: "Active Vacancies",
      value: stats.activeVacancies,
      icon: Users2,
      color: "bg-purple-50 text-purple-600",
      filterStatus: "PUBLISHED",
    },
  ];

  function handleActionTrigger(action, job) {
    if (action === "pause" || action === "resume") {
      actionMutation.mutate({ action, job });
      return;
    }
    setDialog({ action, job });
  }

  const dialogConfig = {
    publish: {
      title: "Publish job vacancy?",
      description:
        dialog.job?.company?.status === "APPROVED" &&
        !dialog.job?.requireAdminApproval
          ? `"${dialog.job?.title}" will become publicly visible to candidates immediately.`
          : `"${dialog.job?.title}" will be submitted for approval.`,
      confirmLabel:
        dialog.job?.company?.status === "APPROVED" &&
        !dialog.job?.requireAdminApproval
          ? "Publish Now"
          : "Submit for Approval",
      variant: "primary",
    },
    close: {
      title: "Close job vacancy?",
      description: `Closing "${dialog.job?.title}" will stop accepting new candidate applications. Existing applications are preserved.`,
      confirmLabel: "Close Vacancy",
      variant: "danger",
    },
    archive: {
      title: "Archive job vacancy?",
      description: `Move "${dialog.job?.title}" to historical archives? It will not appear in active job listings.`,
      confirmLabel: "Archive Job",
      variant: "primary",
    },
    delete: {
      title: "Delete job vacancy permanently?",
      description: `Are you sure you want to permanently delete "${dialog.job?.title}"? This action cannot be undone.`,
      confirmLabel: "Delete Job",
      variant: "danger",
    },
  }[dialog.action] || {};

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand">RECRUITER WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Job Management Dashboard
          </h1>
          <p className="mt-2 text-slate-500">
            Monitor vacancies, manage job lifecycles, and track openings across
            your associated companies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/app/jobs/my"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <List size={16} />
            My Jobs View
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

      {/* ── KPI Summary Cards ── */}
      <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {kpiCards.map(({ label, value, icon: Icon, color, filterStatus }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setFilters((prev) => ({ ...prev, status: filterStatus }));
              setPage(1);
            }}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300"
          >
            <div className={`grid h-9 w-9 place-items-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
          </button>
        ))}
      </div>

      {/* ── Search & Filters ── */}
      <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <JobSearch
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
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

      {/* ── Job Listing Table ── */}
      {jobsQuery.isPending ? (
        <LoadingState title="Loading job vacancies" />
      ) : jobsQuery.isError ? (
        <ErrorState
          title="Could not load jobs"
          message={
            jobsQuery.error?.response?.data?.message ||
            "Failed to load your job listings."
          }
          onRetry={jobsQuery.refetch}
        />
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BriefcaseBusiness className="mx-auto text-slate-400" size={34} />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            No job vacancies found
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {search ||
            filters.status !== "ALL" ||
            filters.companyId !== "ALL" ||
            filters.employmentType !== "ALL" ||
            filters.workMode !== "ALL" ||
            filters.location
              ? "No jobs match your current search or filter settings."
              : "Get started by creating your first job vacancy for an associated company."}
          </p>
          <div className="mt-5">
            <Link
              to="/app/jobs/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Create Job Vacancy
            </Link>
          </div>
        </div>
      ) : (
        <JobTable jobs={jobs} onAction={handleActionTrigger} />
      )}

      {/* ── Pagination ── */}
      {pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
          <p>
            Page <span className="font-semibold">{pagination.page}</span> of{" "}
            <span className="font-semibold">{pagination.totalPages}</span> (
            {pagination.total} jobs)
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

      {/* ── Confirmation Dialog ── */}
      <ConfirmDialog
        open={Boolean(dialog.action && dialog.job)}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmLabel={dialogConfig.confirmLabel}
        variant={dialogConfig.variant}
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
