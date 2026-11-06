import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileEdit,
  XCircle,
  PauseCircle,
  Lock,
  Send,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  Building2,
  AlertTriangle,
  Flag,
  History,
  RotateCcw,
} from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import {
  JobStatusBadge,
  JobModerationBadge,
} from "../components/JobStatusBadge";
import { CompanyStatusBadge } from "../../companies/components/CompanyStatusBadge";
import { ConfirmDialog } from "../../companies/components/ConfirmDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { useAuthStore } from "../../../stores/authStore";
import { formatDate } from "../../../utils/formatters";

export function JobApprovalStatusPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSystemAdmin = user?.role === "admin";
  const [modalAction, setModalAction] = useState(null); // "publish" | "CLEAR_FLAGS" | "PLACE_UNDER_REVIEW" | "RESTRICT_JOB" | "REJECT_JOB" | "RESTORE_JOB"
  const [reason, setReason] = useState("");

  const query = useQuery({
    queryKey: ["jobs", "moderation-detail", id],
    queryFn: () => jobsApi.getJobModeration(id),
    retry: false,
  });

  const payload = query.data?.data ?? query.data ?? {};
  const job = payload.job;
  const logs = payload.logs || [];
  const reports = payload.reports || [];

  function onSuccessUpdate(res, msg) {
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    toast.success(msg);
    setModalAction(null);
    setReason("");
  }

  const publishMutation = useMutation({
    mutationFn: () => jobsApi.publishJob(id),
    onSuccess: (res) =>
      onSuccessUpdate(
        res,
        res?.data?.message || "Job published automatically!"
      ),
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Could not publish job.");
      setModalAction(null);
    },
  });

  const moderationMutation = useMutation({
    mutationFn: ({ action, moderationReason }) =>
      jobsApi.moderateJob(id, { action, reason: moderationReason }),
    onSuccess: (res) =>
      onSuccessUpdate(
        res,
        res?.data?.message || "Moderation decision recorded."
      ),
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Could not apply moderation action."
      );
    },
  });

  if (query.isPending)
    return <LoadingState title="Loading publishing & moderation status" />;
  if (query.isError || !job) {
    return (
      <ErrorState
        title="Could not load job status"
        message={
          query.error?.response?.data?.message ||
          "The requested job could not be found."
        }
        onRetry={query.refetch}
      />
    );
  }

  const companyApproved = job.company?.status === "APPROVED";
  const canPublish =
    job.canManageLifecycle &&
    companyApproved &&
    ["DRAFT", "REJECTED"].includes(job.status) &&
    job.moderationStatus !== "ACTION_REQUIRED";

  const moderationActionConfig = {
    CLEAR_FLAGS: {
      title: "Clear Moderation Flags",
      description:
        "Clear automated or user-reported flags on this job listing and mark its moderation status as CLEARED.",
      confirmLabel: "Clear Flags",
      defaultReason: "Reviewed listing and verified legitimate vacancy details.",
    },
    PLACE_UNDER_REVIEW: {
      title: "Place Job Under Moderation Review",
      description:
        "Temporarily remove this job from public search while investigating potential policy violations. Existing candidate applications are preserved.",
      confirmLabel: "Place Under Review",
      defaultReason: "Placed under administrative review for content verification.",
    },
    RESTRICT_JOB: {
      title: "Restrict & Pause Job Listing",
      description:
        "Pause this job vacancy and require recruiter remediation before it can be resumed. Existing candidate applications are preserved.",
      confirmLabel: "Restrict & Pause Job",
      defaultReason: "Listing paused due to policy or accuracy concerns.",
    },
    REJECT_JOB: {
      title: "Reject Fraudulent / Non-Compliant Job",
      description:
        "Reject this job listing and block public visibility. Existing candidate applications remain intact in the database.",
      confirmLabel: "Reject Job",
      defaultReason: "",
    },
    RESTORE_JOB: {
      title: "Restore & Publish Job Listing",
      description:
        "Restore this job to PUBLISHED status and mark moderation as CLEARED.",
      confirmLabel: "Restore to Published",
      defaultReason: "Listing verified and restored to live status.",
    },
  };

  const activeModConfig = modalAction
    ? moderationActionConfig[modalAction]
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={`/app/jobs/${job.id}/manage`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Job Details
          </Link>
          <p className="mt-3 text-sm font-medium text-brand">
            AUTOMATIC PUBLISHING & MODERATION
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">{job.title}</h1>
            <JobStatusBadge status={job.status} />
            <JobModerationBadge moderationStatus={job.moderationStatus} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Jobs from approved companies publish automatically once mandatory
            checks pass, followed by asynchronous background moderation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {job.canEdit && (
            <Link
              to={`/app/jobs/${job.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={15} />
              Edit Job
            </Link>
          )}
          {canPublish && (
            <Button
              type="button"
              onClick={() => setModalAction("publish")}
              className="gap-2 py-2.5"
            >
              <Send size={15} />
              Publish Job Automatically
            </Button>
          )}
        </div>
      </div>

      {/* Company Eligibility Banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-brand">
              <Building2 size={21} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                Company Publishing Eligibility: {job.company?.name}
              </h2>
              <p className="text-sm text-slate-500">
                {companyApproved
                  ? "Company is APPROVED and active. Validated jobs publish immediately without manual approval delays."
                  : `Company status is ${job.company?.status}. Only APPROVED companies can publish live jobs.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CompanyStatusBadge status={job.company?.status} />
            <Link
              to={`/app/companies/${job.companyId}/approval`}
              className="text-xs font-semibold text-brand hover:underline"
            >
              View Company Status →
            </Link>
          </div>
        </div>
      </section>

      {/* Moderation Alert Banner if Flagged / Under Review / Rejected */}
      {(job.status === "REJECTED" ||
        job.status === "UNDER_REVIEW" ||
        ["FLAGGED", "UNDER_REVIEW", "ACTION_REQUIRED"].includes(
          job.moderationStatus
        )) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0 text-amber-700"
            />
            <div className="space-y-1">
              <h3 className="font-semibold">
                Moderation Notice ({job.moderationStatus})
              </h3>
              <p className="text-sm">
                {job.rejectionReason ||
                  job.moderationReason ||
                  "This job has been flagged by background moderation or user reports for administrator review."}
              </p>
              {job.moderationFlags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.moderationFlags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-lg border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Automatic Publishing & Moderation Pipeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">
            Automatic Publishing & Background Moderation Status
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Publishing status and moderation status are tracked independently so
            legitimate jobs go live immediately.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                1. Pre-Publish Validation
              </p>
              <div className="mt-2 flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 size={16} />
                {companyApproved ? "Eligible & Verified" : "Awaiting Company"}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Company status, mandatory fields, salary, experience, location &
                duplicate check.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                2. Job Lifecycle Status
              </p>
              <div className="mt-2">
                <JobStatusBadge status={job.status} size="sm" />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {job.publishedAt
                  ? `Published on ${formatDate(job.publishedAt)}`
                  : "Currently not published"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                3. Async Moderation
              </p>
              <div className="mt-2">
                <JobModerationBadge
                  moderationStatus={job.moderationStatus}
                  size="sm"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Risk score: {job.moderationScore || 0}/100 · Reports:{" "}
                {job.reportCount || 0}
              </p>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2">
              <History size={16} className="text-brand" />
              <h3 className="text-sm font-semibold text-slate-900">
                Moderation & Lifecycle Audit Log
              </h3>
            </div>

            {logs.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                No moderation events recorded yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {log.action} ({log.actorType})
                      </span>
                      <span className="text-slate-400">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    {log.reason && (
                      <p className="mt-1 text-slate-600">{log.reason}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>
                        Status: {log.previousStatus || "—"} →{" "}
                        {log.newStatus || "—"}
                      </span>
                      <span>·</span>
                      <span>
                        Moderation: {log.previousModerationStatus || "—"} →{" "}
                        {log.newModerationStatus || "—"}
                      </span>
                      {log.actor?.fullName && (
                        <>
                          <span>·</span>
                          <span>By {log.actor.fullName}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Admin Moderation Controls */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand" />
            <h2 className="text-base font-semibold text-slate-900">
              {isSystemAdmin ? "Admin Job Moderation" : "Moderation Summary"}
            </h2>
          </div>

          <p className="text-xs text-slate-500">
            {isSystemAdmin
              ? "Review flagged or reported listings. Restricting or rejecting a job preserves all existing candidate applications."
              : "Administrators only intervene when background checks or candidate reports flag a listing."}
          </p>

          <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Moderation Status</span>
              <span className="font-semibold text-slate-800">
                {job.moderationStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Automated Risk Score</span>
              <span className="font-semibold text-slate-800">
                {job.moderationScore || 0} / 100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Candidate Reports</span>
              <span className="font-semibold text-slate-800">
                {job.reportCount || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Last Checked</span>
              <span className="font-semibold text-slate-800">
                {formatDate(job.moderatedAt || job.publishedAt || job.createdAt)}
              </span>
            </div>
          </div>

          {isSystemAdmin && (
            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setReason(
                    moderationActionConfig.CLEAR_FLAGS.defaultReason
                  );
                  setModalAction("CLEAR_FLAGS");
                }}
                className="w-full justify-center gap-2 bg-emerald-600 py-2.5 text-xs hover:bg-emerald-700"
              >
                <CheckCircle2 size={14} />
                Clear Flags & Mark Cleared
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setReason(
                    moderationActionConfig.PLACE_UNDER_REVIEW.defaultReason
                  );
                  setModalAction("PLACE_UNDER_REVIEW");
                }}
                className="w-full justify-center gap-2 border-amber-200 py-2.5 text-xs text-amber-800 hover:bg-amber-50"
              >
                <ShieldAlert size={14} />
                Place Under Review
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setReason(moderationActionConfig.RESTRICT_JOB.defaultReason);
                  setModalAction("RESTRICT_JOB");
                }}
                className="w-full justify-center gap-2 border-orange-200 py-2.5 text-xs text-orange-700 hover:bg-orange-50"
              >
                <PauseCircle size={14} />
                Restrict / Pause Job
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setReason("");
                  setModalAction("REJECT_JOB");
                }}
                className="w-full justify-center gap-2 border-red-200 py-2.5 text-xs text-red-600 hover:bg-red-50"
              >
                <XCircle size={14} />
                Reject Fraudulent Listing
              </Button>

              {job.status !== "PUBLISHED" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setReason(moderationActionConfig.RESTORE_JOB.defaultReason);
                    setModalAction("RESTORE_JOB");
                  }}
                  className="w-full justify-center gap-2 py-2.5 text-xs"
                >
                  <RotateCcw size={14} />
                  Restore to Published
                </Button>
              )}
            </div>
          )}

          {isSystemAdmin && reports.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <Flag size={13} className="text-red-500" />
                User Reports ({reports.length})
              </h3>
              <div className="mt-2 space-y-2">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-red-100 bg-red-50/50 p-2.5 text-xs"
                  >
                    <div className="flex justify-between font-semibold text-red-900">
                      <span>{r.category}</span>
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                    {r.details && (
                      <p className="mt-1 text-red-800">{r.details}</p>
                    )}
                    <p className="mt-1 text-[11px] text-red-600">
                      Reported by {r.reporter?.fullName || r.reporter?.email}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={modalAction === "publish"}
        onClose={() => setModalAction(null)}
        onConfirm={() => publishMutation.mutate()}
        isLoading={publishMutation.isPending}
        title="Publish job vacancy automatically?"
        description={`"${job.title}" will be validated and published immediately to candidates without waiting for manual administrator approval.`}
        confirmLabel="Publish Now"
      />

      {/* Admin Moderation Modal */}
      {activeModConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {activeModConfig.title}
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              {activeModConfig.description}
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Moderation Reason (recorded in audit log) *
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a clear reason for this moderation action (minimum 5 characters)..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalAction(null);
                  setReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  moderationMutation.isPending || reason.trim().length < 5
                }
                onClick={() =>
                  moderationMutation.mutate({
                    action: modalAction,
                    moderationReason: reason.trim(),
                  })
                }
              >
                {moderationMutation.isPending
                  ? "Applying..."
                  : activeModConfig.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
