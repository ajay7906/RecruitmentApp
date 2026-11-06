import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Search,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { applicationsApi } from "../api/applicationsApi";
import { ApplicationStatistics } from "../components/ApplicationStatistics";
import { ApplicationSearch } from "../components/ApplicationSearch";
import { ApplicationFilters } from "../components/ApplicationFilters";
import { ApplicationTable } from "../components/ApplicationTable";
import { ApplicationCard } from "../components/ApplicationCard";
import { WithdrawalDialog } from "../components/WithdrawalDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";

const INITIAL_FILTERS = {
  q: "",
  company: "",
  status: "",
  appliedFrom: "",
  sortBy: "appliedAt",
  sortOrder: "desc",
  page: 1,
  limit: 10,
};

export function MyApplicationsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState("table");
  const [withdrawingApp, setWithdrawingApp] = useState(null);

  const query = useQuery({
    queryKey: ["applications", "my", filters],
    queryFn: () => applicationsApi.getMyApplications(filters),
  });

  const withdrawMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      applicationsApi.withdrawApplication(id, { reason }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(
        res?.data?.message || "Application withdrawn successfully."
      );
      setWithdrawingApp(null);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to withdraw application."
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
    setFilters(INITIAL_FILTERS);
  }

  if (query.isPending) {
    return <LoadingState title="Loading your applications" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load applications"
        message={
          query.error?.response?.data?.message ||
          "An error occurred while fetching your job applications."
        }
        onRetry={query.refetch}
      />
    );
  }

  const payload = query.data?.data ?? query.data ?? {};
  const applications = payload.applications || [];
  const stats = payload.stats || {};
  const pagination = payload.pagination || {
    page: 1,
    totalPages: 1,
    total: applications.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            CANDIDATE WORKSPACE
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            My Applications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your job application progress, review submitted documents, and
            manage active applications.
          </p>
        </div>

        <Link
          to="/app/jobs"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Search size={16} />
          Explore More Jobs
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <ApplicationStatistics
        stats={stats}
        activeStatus={filters.status}
        onSelectStatus={(status) => updateFilters({ status })}
        mode="candidate"
      />

      {/* Search, Filters & View Toggle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ApplicationSearch
            value={filters.q}
            onChange={(q) => updateFilters({ q })}
            placeholder="Search by job title or department..."
          />

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        <ApplicationFilters
          mode="candidate"
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
        />
      </div>

      {/* Applications List or Empty State */}
      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto text-slate-400" size={34} />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            No applications found
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {filters.q || filters.status || filters.company || filters.appliedFrom
              ? "No applications match your current search or filter criteria."
              : "You haven't applied to any jobs yet. Browse published job openings and submit your first application."}
          </p>
          <div className="mt-5">
            <Link
              to="/app/jobs"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Browse Open Jobs
            </Link>
          </div>
        </div>
      ) : viewMode === "table" ? (
        <ApplicationTable
          applications={applications}
          mode="candidate"
          onWithdrawClick={(app) => setWithdrawingApp(app)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onWithdrawClick={(a) => setWithdrawingApp(a)}
            />
          ))}
        </div>
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

      {/* Withdrawal Confirmation Dialog */}
      <WithdrawalDialog
        open={Boolean(withdrawingApp)}
        jobTitle={
          withdrawingApp?.job?.title || withdrawingApp?.jobSnapshot?.title
        }
        companyName={
          withdrawingApp?.company?.name ||
          withdrawingApp?.jobSnapshot?.companyName
        }
        isPending={withdrawMutation.isPending}
        onClose={() => setWithdrawingApp(null)}
        onConfirm={({ reason }) =>
          withdrawMutation.mutate({ id: withdrawingApp.id, reason })
        }
      />
    </div>
  );
}
