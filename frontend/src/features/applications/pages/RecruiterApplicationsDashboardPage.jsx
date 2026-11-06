import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { applicationsApi } from "../api/applicationsApi";
import { companiesApi } from "../../companies/api/companiesApi";
import { jobsApi } from "../../jobs/api/jobsApi";
import { ApplicationStatistics } from "../components/ApplicationStatistics";
import { ApplicationSearch } from "../components/ApplicationSearch";
import { ApplicationFilters } from "../components/ApplicationFilters";
import { ApplicationTable } from "../components/ApplicationTable";
import { StatusUpdateDialog } from "../components/StatusUpdateDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";

export function RecruiterApplicationsDashboardPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialJobId = searchParams.get("jobId") || "";
  const initialCompanyId = searchParams.get("companyId") || "";

  const [filters, setFilters] = useState({
    q: "",
    companyId: initialCompanyId,
    jobId: initialJobId,
    status: "",
    skill: "",
    minExperience: "",
    appliedFrom: "",
    sortBy: "appliedAt",
    sortOrder: "desc",
    page: 1,
    limit: 10,
  });

  const [statusDialogApp, setStatusDialogApp] = useState(null);

  const companiesQuery = useQuery({
    queryKey: ["companies", "my-select"],
    queryFn: () => companiesApi.getMyCompanies({ limit: 50 }),
  });

  const jobsQuery = useQuery({
    queryKey: ["jobs", "my-select", filters.companyId],
    queryFn: () =>
      jobsApi.getMyJobs({
        companyId: filters.companyId || undefined,
        limit: 50,
      }),
  });

  const applicationsQuery = useQuery({
    queryKey: ["applications", "recruiter", filters],
    queryFn: () => {
      const cleanParams = {};
      for (const [k, v] of Object.entries(filters)) {
        if (v !== "" && v !== null && v !== undefined) {
          cleanParams[k] = v;
        }
      }
      return applicationsApi.listRecruiterApplications(cleanParams);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      applicationsApi.updateApplicationStatus(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(
        res?.data?.message || "Application status updated successfully."
      );
      setStatusDialogApp(null);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to update application status."
      );
    },
  });

  function updateFilters(partial) {
    setFilters((prev) => ({
      ...prev,
      ...partial,
      page: partial.page ?? 1,
    }));
  }

  function resetFilters() {
    setFilters({
      q: "",
      companyId: "",
      jobId: "",
      status: "",
      skill: "",
      minExperience: "",
      appliedFrom: "",
      sortBy: "appliedAt",
      sortOrder: "desc",
      page: 1,
      limit: 10,
    });
  }

  if (applicationsQuery.isPending) {
    return <LoadingState title="Loading candidate applications" />;
  }

  if (applicationsQuery.isError) {
    return (
      <ErrorState
        title="Could not load applications"
        message={
          applicationsQuery.error?.response?.data?.message ||
          "An error occurred while loading received applications."
        }
        onRetry={applicationsQuery.refetch}
      />
    );
  }

  const payload =
    applicationsQuery.data?.data ?? applicationsQuery.data ?? {};
  const applications = payload.applications || [];
  const stats = payload.stats || {};
  const pagination = payload.pagination || {
    page: 1,
    totalPages: 1,
    total: applications.length,
  };

  const companies =
    companiesQuery.data?.data?.companies ??
    companiesQuery.data?.companies ??
    [];
  const jobs =
    jobsQuery.data?.data?.jobs ?? jobsQuery.data?.jobs ?? [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            HIRING PIPELINE
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Application Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review candidate applications, evaluate resumes, manage hiring
            stages, and record internal screening notes.
          </p>
        </div>

        <Link
          to="/app/jobs/manage"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <BriefcaseBusiness size={16} />
          Manage Job Postings
        </Link>
      </div>

      {/* KPI Statistics */}
      <ApplicationStatistics
        stats={stats}
        activeStatus={filters.status}
        onSelectStatus={(status) => updateFilters({ status })}
        mode="recruiter"
      />

      {/* Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <ApplicationSearch
          value={filters.q}
          onChange={(q) => updateFilters({ q })}
          placeholder="Search by candidate name, email, job title, or company..."
        />

        <ApplicationFilters
          mode="recruiter"
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          companies={companies}
          jobs={jobs}
        />
      </div>

      {/* Applications Table */}
      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto text-slate-400" size={34} />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            No candidate applications found
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            No applications match your current filter selection, or your
            published jobs have not received applications yet.
          </p>
        </div>
      ) : (
        <ApplicationTable
          applications={applications}
          mode="recruiter"
          onStatusUpdateClick={(app) => setStatusDialogApp(app)}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs text-slate-600">
          <span>
            Showing page <strong>{pagination.page}</strong> of{" "}
            <strong>{pagination.totalPages}</strong> ({pagination.total} total
            applications)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => updateFilters({ page: pagination.page - 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Prev
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateFilters({ page: pagination.page + 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      <StatusUpdateDialog
        open={Boolean(statusDialogApp)}
        application={statusDialogApp}
        isPending={statusMutation.isPending}
        onClose={() => setStatusDialogApp(null)}
        onConfirm={(payload) =>
          statusMutation.mutate({
            id: statusDialogApp.id,
            payload,
          })
        }
      />
    </div>
  );
}
