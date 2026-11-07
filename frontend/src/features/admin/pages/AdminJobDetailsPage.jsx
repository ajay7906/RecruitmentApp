import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Ban,
  Flag,
  Lock,
  Building2,
  MapPin,
  BriefcaseBusiness,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { JobStatusBadge } from "../components/JobStatusBadge";
import { CompanyStatusBadge } from "../components/CompanyStatusBadge";
import { ApprovalDialog } from "../components/ApprovalDialog";
import { RejectionDialog } from "../components/RejectionDialog";
import { SuspensionDialog } from "../components/SuspensionDialog";

export function AdminJobDetailsPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getJobDetails(id);
      setJob(res);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  async function handleAction(fn, successMsg, closeDialog) {
    setSubmitting(true);
    try {
      await fn();
      toast.success(successMsg);
      closeDialog(false);
      loadJob();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading job details...</div>;
  }

  if (!job) {
    return <div className="p-8 text-center text-sm text-slate-500">Job not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/jobs"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
              <JobStatusBadge status={job.status} moderationStatus={job.moderationStatus} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Company: {job.company?.name} • Created by {job.createdBy?.fullName || job.createdBy?.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {job.status !== "PUBLISHED" && (
            <button
              type="button"
              onClick={() => setApproveOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 size={14} /> Approve & Publish
            </button>
          )}
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            <XCircle size={14} /> Reject
          </button>
          <button
            type="button"
            onClick={() => setSuspendOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700"
          >
            <Ban size={14} /> Suspend / Restrict
          </button>
          <button
            type="button"
            onClick={() => setFlagOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            <Flag size={14} /> Flag
          </button>
          {job.status !== "CLOSED" && (
            <button
              type="button"
              onClick={() => setCloseOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Lock size={14} /> Close Job
            </button>
          )}
        </div>
      </div>

      {(job.rejectionReason || job.moderationReason) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-bold">Moderation / Rejection Notice</p>
          <p className="mt-1">{job.rejectionReason || job.moderationReason}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Metadata & Company Info */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900">Job Specifications</h2>
            <div className="flex items-center gap-2 text-slate-600">
              <BriefcaseBusiness size={14} className="text-slate-400" />
              <span>
                {job.employmentType?.replace("_", " ")} • {job.workMode} • {job.numberOfOpenings} openings
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin size={14} className="text-slate-400" />
              <span>
                {[job.city, job.state, job.country].filter(Boolean).join(", ") || job.location || "Remote"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <DollarSign size={14} className="text-slate-400" />
              <span>
                {job.minSalary || job.maxSalary
                  ? `${job.salaryCurrency || "INR"} ${job.minSalary ?? 0} - ${job.maxSalary ?? 0} (${job.salaryPeriod || "YEARLY"})`
                  : "Salary not disclosed"}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Department:</span>{" "}
                {job.department || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Experience:</span>{" "}
                {job.minExperience ?? 0} - {job.maxExperience ?? "Any"} years ({job.experienceLevel || "N/A"})
              </p>
              <p>
                <span className="font-semibold text-slate-800">Applications:</span>{" "}
                {job.applicationsCount ?? 0}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Moderation Score:</span>{" "}
                {job.moderationScore ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Building2 size={15} className="text-brand" /> Company Status
              </h2>
              <CompanyStatusBadge status={job.company?.status} />
            </div>
            <p className="font-semibold text-slate-800">{job.company?.name}</p>
            <p className="text-slate-500">{job.company?.industry}</p>
            <Link
              to={`/admin/companies/${job.companyId}`}
              className="inline-block pt-1 font-semibold text-brand hover:underline"
            >
              Inspect Company Profile →
            </Link>
          </div>
        </div>

        {/* Right: Job Description, Skills, Moderation History & Reports */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Job Description & Requirements</h2>
            <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-slate-700">
              {job.description}
            </p>

            {job.requiredSkills?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-700">Required Skills</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((sk) => (
                    <span
                      key={sk}
                      className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-brand"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Moderation Audit History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">
              Moderation History ({job.moderationLogs?.length || 0})
            </h2>
            <div className="mt-3 divide-y divide-slate-100">
              {(job.moderationLogs || []).length === 0 ? (
                <p className="py-4 text-xs text-slate-400">No moderation events logged.</p>
              ) : (
                job.moderationLogs.map((log) => (
                  <div key={log.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {log.action} ({log.previousStatus || "—"} → {log.newStatus || "—"})
                      </span>
                      <span className="text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {log.reason && <p className="mt-0.5 text-slate-600">{log.reason}</p>}
                    <p className="text-[11px] text-slate-400">
                      Actor: {log.actor?.fullName || log.actorType}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* User Reports */}
          {job.reports?.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-rose-800">
                Submitted Abuse / Scam Reports ({job.reports.length})
              </h2>
              <div className="mt-3 divide-y divide-slate-100">
                {job.reports.map((rep) => (
                  <div key={rep.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{rep.category}</span>
                      <span className="text-slate-400">
                        {new Date(rep.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {rep.details && <p className="mt-0.5 text-slate-600">{rep.details}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ApprovalDialog
        open={approveOpen}
        title={`Approve & Publish "${job.title}"`}
        description="Approving clears moderation flags and publishes the job vacancy."
        confirmLabel="Approve & Publish"
        loading={submitting}
        onClose={() => setApproveOpen(false)}
        onConfirm={({ notes, reason }) =>
          handleAction(() => adminApi.approveJob(id, { notes, reason }), "Job approved and published", setApproveOpen)
        }
      />

      <RejectionDialog
        open={rejectOpen}
        title={`Reject "${job.title}"`}
        description="Select a category and provide a reason for rejecting this job listing."
        confirmLabel="Reject Job"
        showCategory
        loading={submitting}
        onClose={() => setRejectOpen(false)}
        onConfirm={({ reason, category }) =>
          handleAction(() => adminApi.rejectJob(id, { reason, category }), "Job rejected", setRejectOpen)
        }
      />

      <RejectionDialog
        open={suspendOpen}
        title={`Suspend / Restrict "${job.title}"`}
        description="Pauses this job and marks it ACTION_REQUIRED while preserving candidate applications."
        confirmLabel="Suspend Job"
        showCategory
        loading={submitting}
        onClose={() => setSuspendOpen(false)}
        onConfirm={({ reason, category }) =>
          handleAction(() => adminApi.suspendJob(id, { reason, category }), "Job suspended", setSuspendOpen)
        }
      />

      <RejectionDialog
        open={flagOpen}
        title={`Flag "${job.title}" for Review`}
        description="Flags this job listing for moderation attention."
        confirmLabel="Flag Job"
        showCategory
        loading={submitting}
        onClose={() => setFlagOpen(false)}
        onConfirm={({ reason, category }) =>
          handleAction(() => adminApi.flagJob(id, { reason, category }), "Job flagged", setFlagOpen)
        }
      />

      <SuspensionDialog
        open={closeOpen}
        title={`Close "${job.title}"`}
        description="Closes the job posting so it no longer accepts new applications."
        confirmLabel="Close Job"
        loading={submitting}
        onClose={() => setCloseOpen(false)}
        onConfirm={({ reason }) =>
          handleAction(() => adminApi.closeJob(id, { reason }), "Job closed", setCloseOpen)
        }
      />
    </div>
  );
}
