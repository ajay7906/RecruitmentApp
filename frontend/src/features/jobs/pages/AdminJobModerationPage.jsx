import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  Flag,
  CheckCircle2,
  PauseCircle,
  XCircle,
  RotateCcw,
  Eye,
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import {
  JobStatusBadge,
  JobModerationBadge,
} from "../components/JobStatusBadge";
import { CompanyStatusBadge } from "../../companies/components/CompanyStatusBadge";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { formatDate } from "../../../utils/formatters";

const MODERATION_TABS = [
  { id: "FLAGGED_ALL", label: "Needs Review (Flagged / Reported)" },
  { id: "FLAGGED", label: "Flagged" },
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "ACTION_REQUIRED", label: "Restricted / Action Required" },
  { id: "CLEARED", label: "Cleared" },
  { id: "ALL", label: "All Jobs" },
];

const ACTION_CONFIG = {
  CLEAR_FLAGS: {
    title: "Clear Moderation Flags",
    description:
      "Mark this listing as CLEARED and remove active flags. If the job was UNDER_REVIEW, it will return to PUBLISHED.",
    confirmLabel: "Clear Flags",
    defaultReason: "Reviewed listing and verified legitimate vacancy details.",
  },
  PLACE_UNDER_REVIEW: {
    title: "Place Job Under Review",
    description:
      "Temporarily hide this job from public candidate search while investigating flags or reports. Existing applications are preserved.",
    confirmLabel: "Place Under Review",
    defaultReason: "Placed under moderation review for policy verification.",
  },
  RESTRICT_JOB: {
    title: "Restrict & Pause Job",
    description:
      "Pause this job and mark as ACTION_REQUIRED so the recruiter must remediate issues. Existing candidate applications are preserved.",
    confirmLabel: "Restrict & Pause",
    defaultReason: "Listing paused due to policy or accuracy concerns.",
  },
  REJECT_JOB: {
    title: "Reject Fraudulent / Non-Compliant Job",
    description:
      "Reject this job listing and block public visibility. Existing candidate applications are preserved in the database.",
    confirmLabel: "Reject Job",
    defaultReason: "",
  },
  RESTORE_JOB: {
    title: "Restore Job to Published",
    description:
      "Restore this restricted/rejected job back to PUBLISHED status and mark moderation as CLEARED.",
    confirmLabel: "Restore Job",
    defaultReason: "Listing verified and restored to live status.",
  },
};

export function AdminJobModerationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("FLAGGED_ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { job, action }
  const [reason, setReason] = useState("");

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = {
    q: debouncedSearch || undefined,
    flaggedOnly: activeTab === "FLAGGED_ALL" ? true : undefined,
    moderationStatus:
      activeTab !== "FLAGGED_ALL" && activeTab !== "ALL"
        ? activeTab
        : undefined,
    sortBy: activeTab === "FLAGGED_ALL" ? "moderationScore" : "createdAt",
    sortOrder: "desc",
    page,
    limit: 10,
  };

  const jobsQuery = useQuery({
    queryKey: ["jobs", "admin-moderation", queryParams],
    queryFn: () => jobsApi.listAdminJobs(queryParams),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ jobId, action, moderationReason }) =>
      jobsApi.moderateJob(jobId, { action, reason: moderationReason }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(res?.data?.message || "Moderation action applied.");
      setModal(null);
      setReason("");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to apply moderation action."
      );
    },
  });

  const jobs = jobsQuery.data?.data?.jobs ?? jobsQuery.data?.jobs ?? [];
  const stats = jobsQuery.data?.data?.stats ?? {};
  const pagination = jobsQuery.data?.data?.pagination ?? {
    total: jobs.length,
    page: 1,
    totalPages: 1,
  };

  function openModerationModal(job, action) {
    const cfg = ACTION_CONFIG[action];
    setReason(cfg?.defaultReason || "");
    setModal({ job, action });
  }

  const activeCfg = modal ? ACTION_CONFIG[modal.action] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand">
            TRUST & SAFETY ADMINISTRATION
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Admin Job Moderation
          </h1>
          <p className="mt-1 text-slate-500">
            Jobs from approved companies publish automatically. Review listings
            flagged by asynchronous background checks or candidate reports.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <Flag size={17} />
            <span className="text-xs font-semibold uppercase">
              Flagged / Action Needed
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-950">
            {stats.flaggedJobs ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
          <div className="flex items-center gap-2 text-orange-800">
            <ShieldAlert size={17} />
            <span className="text-xs font-semibold uppercase">
              Under Review
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-orange-950">
            {stats.underReviewJobs ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <Flag size={17} />
            <span className="text-xs font-semibold uppercase">
              User Reported
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-950">
            {stats.reportedJobs ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <ShieldCheck size={17} />
            <span className="text-xs font-semibold uppercase">
              Live Published
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-950">
            {stats.publishedJobs ?? 0}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {MODERATION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title or company..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Listings Table */}
      {jobsQuery.isPending ? (
        <LoadingState title="Loading moderation queue" />
      ) : jobsQuery.isError ? (
        <ErrorState
          title="Could not load moderation queue"
          message={
            jobsQuery.error?.response?.data?.message ||
            "Failed to load moderation listings."
          }
          onRetry={jobsQuery.refetch}
        />
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ShieldCheck className="mx-auto text-emerald-500" size={34} />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            No jobs match this moderation filter
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            All automatically published jobs are currently clear or no listings
            match your search criteria.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Job & Company</th>
                  <th className="px-4 py-3.5">Lifecycle & Moderation</th>
                  <th className="px-4 py-3.5">Signals & Flags</th>
                  <th className="px-4 py-3.5">Published</th>
                  <th className="px-5 py-3.5 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <Link
                        to={`/app/jobs/${job.id}/publishing`}
                        className="font-semibold text-slate-900 hover:text-brand"
                      >
                        {job.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <Building2 size={13} />
                          {job.company?.name}
                        </span>
                        <CompanyStatusBadge
                          status={job.company?.status}
                          size="sm"
                        />
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <JobStatusBadge status={job.status} size="sm" />
                        <JobModerationBadge
                          moderationStatus={job.moderationStatus}
                          size="sm"
                        />
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          Score: {job.moderationScore || 0}/100
                        </span>
                        {job.reportCount > 0 && (
                          <span className="rounded-md bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                            {job.reportCount} report(s)
                          </span>
                        )}
                      </div>
                      {job.moderationFlags?.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {job.moderationFlags.map((f) => (
                            <span
                              key={f}
                              className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                      {job.moderationReason && (
                        <p className="mt-1 line-clamp-2 max-w-xs text-xs text-slate-500">
                          {job.moderationReason}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-600">
                      {formatDate(job.publishedAt || job.createdAt)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link
                          to={`/app/jobs/${job.id}/publishing`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={13} />
                          Inspect
                        </Link>

                        {job.moderationStatus !== "CLEARED" && (
                          <button
                            type="button"
                            onClick={() =>
                              openModerationModal(job, "CLEAR_FLAGS")
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <CheckCircle2 size={13} />
                            Clear
                          </button>
                        )}

                        {job.status !== "UNDER_REVIEW" && (
                          <button
                            type="button"
                            onClick={() =>
                              openModerationModal(job, "PLACE_UNDER_REVIEW")
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                          >
                            <ShieldAlert size={13} />
                            Review
                          </button>
                        )}

                        {job.status === "PUBLISHED" && (
                          <button
                            type="button"
                            onClick={() =>
                              openModerationModal(job, "RESTRICT_JOB")
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                          >
                            <PauseCircle size={13} />
                            Restrict
                          </button>
                        )}

                        {job.status !== "REJECTED" && (
                          <button
                            type="button"
                            onClick={() =>
                              openModerationModal(job, "REJECT_JOB")
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            <XCircle size={13} />
                            Reject
                          </button>
                        )}

                        {["PAUSED", "REJECTED", "UNDER_REVIEW"].includes(
                          job.status
                        ) && (
                          <button
                            type="button"
                            onClick={() =>
                              openModerationModal(job, "RESTORE_JOB")
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-blue-100"
                          >
                            <RotateCcw size={13} />
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
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

      {/* Moderation Reason Modal */}
      {modal && activeCfg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {activeCfg.title}
            </h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Job: {modal.job.title} ({modal.job.company?.name})
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {activeCfg.description}
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Moderation Reason (recorded in audit log) *
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for this moderation action (at least 5 characters)..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModal(null);
                  setReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  moderateMutation.isPending || reason.trim().length < 5
                }
                onClick={() =>
                  moderateMutation.mutate({
                    jobId: modal.job.id,
                    action: modal.action,
                    moderationReason: reason.trim(),
                  })
                }
              >
                {moderateMutation.isPending
                  ? "Saving..."
                  : activeCfg.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
