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
  Archive,
  Send,
  Pencil,
  ShieldCheck,
  Building2,
  AlertTriangle,
} from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import { JobStatusBadge } from "../components/JobStatusBadge";
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
  const [modal, setModal] = useState(null); // "publish" | "approve" | "reject"

  const query = useQuery({
    queryKey: ["jobs", "detail", id],
    queryFn: () => jobsApi.getById(id),
    retry: false,
  });

  const job = query.data?.data?.job ?? query.data?.job;

  function onSuccessUpdate(res, msg) {
    const updated = res?.data?.job ?? res?.job;
    if (updated) {
      queryClient.setQueryData(["jobs", "detail", id], {
        success: true,
        data: { job: updated },
      });
    }
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    toast.success(msg);
    setModal(null);
  }

  const publishMutation = useMutation({
    mutationFn: () => {
      const submitForApproval =
        job?.company?.status !== "APPROVED" || Boolean(job?.requireAdminApproval);
      return jobsApi.publishJob(id, { submitForApproval });
    },
    onSuccess: (res) =>
      onSuccessUpdate(res, res?.data?.message || "Job status updated!"),
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Could not publish job.");
      setModal(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => jobsApi.approveJob(id),
    onSuccess: (res) => onSuccessUpdate(res, "Job approved and published!"),
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Could not approve job.");
      setModal(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => jobsApi.rejectJob(id, reason),
    onSuccess: (res) => onSuccessUpdate(res, "Job publishing rejected."),
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Could not reject job.");
      setModal(null);
    },
  });

  if (query.isPending)
    return <LoadingState title="Loading job publishing status" />;
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
    job.canManageLifecycle && ["DRAFT", "REJECTED"].includes(job.status);

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
            JOB PUBLISHING & LIFECYCLE
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Track publishing eligibility, company approval prerequisite, and
            lifecycle transitions.
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
              onClick={() => setModal("publish")}
              className="gap-2 py-2.5"
            >
              <Send size={15} />
              {companyApproved && !job.requireAdminApproval
                ? "Publish Job Now"
                : "Submit for Approval"}
            </Button>
          )}
        </div>
      </div>

      {/* Company Prerequisite Check */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-brand">
              <Building2 size={21} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                Company Approval Prerequisite: {job.company?.name}
              </h2>
              <p className="text-sm text-slate-500">
                {companyApproved
                  ? "This company is APPROVED and eligible to publish live job vacancies."
                  : "A company must be APPROVED before its jobs can be publicly listed."}
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

      {/* Rejection Notice */}
      {job.status === "REJECTED" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <h3 className="font-semibold">Job Publishing Request Rejected</h3>
              <p className="mt-1 text-sm">
                {job.rejectionReason ||
                  "Please review and update the job details before resubmitting."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lifecycle Timeline */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Job Lifecycle Stages
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              key: "DRAFT",
              title: "1. Draft",
              desc: `Created on ${formatDate(job.createdAt)}`,
              icon: FileEdit,
              active: job.status === "DRAFT",
            },
            {
              key: "PENDING_APPROVAL",
              title: "2. Review / Approval",
              desc: job.submittedAt
                ? `Submitted ${formatDate(job.submittedAt)}`
                : "Optional admin review stage",
              icon: Clock,
              active: job.status === "PENDING_APPROVAL",
            },
            {
              key: "PUBLISHED",
              title: "3. Published & Live",
              desc: job.publishedAt
                ? `Published ${formatDate(job.publishedAt)}`
                : "Visible to candidates",
              icon: CheckCircle2,
              active: job.status === "PUBLISHED",
            },
            {
              key: "CLOSED",
              title: "4. Paused / Closed / Archived",
              desc: job.closedAt
                ? `Closed ${formatDate(job.closedAt)}`
                : "End of active hiring cycle",
              icon:
                job.status === "PAUSED"
                  ? PauseCircle
                  : job.status === "ARCHIVED"
                  ? Archive
                  : Lock,
              active: ["PAUSED", "CLOSED", "EXPIRED", "ARCHIVED"].includes(
                job.status
              ),
            },
          ].map(({ key, title, desc, icon: Icon, active }) => (
            <div
              key={key}
              className={`rounded-2xl border p-4 ${
                active
                  ? "border-brand bg-blue-50/40"
                  : "border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-lg ${
                    active
                      ? "bg-brand text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <Icon size={16} />
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  {title}
                </h3>
              </div>
              <p className="mt-2 text-xs text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Admin Controls */}
      {isSystemAdmin && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Administrator Job Review Controls
                </h2>
                <p className="text-xs text-slate-600">
                  Approve or reject this job vacancy.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {["PENDING_APPROVAL", "REJECTED", "DRAFT"].includes(
                job.status
              ) && (
                <Button
                  type="button"
                  onClick={() => setModal("approve")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Approve & Publish
                </Button>
              )}
              {["PENDING_APPROVAL", "PUBLISHED"].includes(job.status) && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModal("reject")}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle size={15} className="mr-1.5" />
                  Reject Job
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={modal === "publish"}
        title="Publish job vacancy?"
        description={
          companyApproved && !job.requireAdminApproval
            ? `"${job.title}" will be published immediately and made visible to candidates.`
            : `"${job.title}" will be submitted for administrator approval.`
        }
        confirmLabel={
          companyApproved && !job.requireAdminApproval
            ? "Publish Job"
            : "Submit for Approval"
        }
        isPending={publishMutation.isPending}
        onClose={() => setModal(null)}
        onConfirm={() => publishMutation.mutate()}
      />

      <ConfirmDialog
        open={modal === "approve"}
        title="Approve and publish job?"
        description={`Approve "${job.title}" so it becomes publicly visible to candidates?`}
        confirmLabel="Approve & Publish"
        isPending={approveMutation.isPending}
        onClose={() => setModal(null)}
        onConfirm={() => approveMutation.mutate()}
      />

      <ConfirmDialog
        open={modal === "reject"}
        title="Reject job vacancy"
        description="Provide a clear reason so the recruiter can address the issue and resubmit."
        confirmLabel="Reject Job"
        variant="danger"
        requireReason
        reasonLabel="Rejection reason *"
        isPending={rejectMutation.isPending}
        onClose={() => setModal(null)}
        onConfirm={(reason) => rejectMutation.mutate(reason)}
      />
    </div>
  );
}
