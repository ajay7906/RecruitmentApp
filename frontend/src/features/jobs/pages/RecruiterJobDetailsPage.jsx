import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  BriefcaseBusiness,
  Clock,
  Wallet,
  Users2,
  Calendar,
  Pencil,
  Send,
  PauseCircle,
  PlayCircle,
  Lock,
  Archive,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Eye,
} from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import { formatSalaryRange, formatExperienceRange } from "../schema/jobSchemas";
import {
  JobStatusBadge,
  JobModerationBadge,
} from "../components/JobStatusBadge";
import { CompanyStatusBadge } from "../../companies/components/CompanyStatusBadge";
import { ConfirmDialog } from "../../companies/components/ConfirmDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { formatDate } from "../../../utils/formatters";

export function RecruiterJobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState(null);

  const query = useQuery({
    queryKey: ["jobs", "detail", id],
    queryFn: () => jobsApi.getById(id),
    retry: false,
  });

  const job = query.data?.data?.job ?? query.data?.job;

  function syncJobCache(res) {
    const updated = res?.data?.job ?? res?.job;
    if (updated) {
      queryClient.setQueryData(["jobs", "detail", id], {
        success: true,
        data: { job: updated },
      });
    }
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    setConfirmAction(null);
  }

  const lifecycleMutation = useMutation({
    mutationFn: async (action) => {
      if (action === "publish") {
        return jobsApi.publishJob(id);
      }
      if (action === "pause") return jobsApi.pauseJob(id);
      if (action === "resume") return jobsApi.resumeJob(id);
      if (action === "close") return jobsApi.closeJob(id);
      if (action === "archive") return jobsApi.archiveJob(id);
      if (action === "delete") {
        await jobsApi.deleteJob(id);
        return { deleted: true };
      }
    },
    onSuccess: (res) => {
      if (res?.deleted) {
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        toast.success("Job deleted permanently.");
        navigate("/app/jobs/manage", { replace: true });
        return;
      }
      syncJobCache(res);
      toast.success(res?.data?.message || "Job status updated!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Could not update job status.");
      setConfirmAction(null);
    },
  });

  if (query.isPending) return <LoadingState title="Loading job details" />;
  if (query.isError || !job) {
    return (
      <ErrorState
        title="Could not load job details"
        message={
          query.error?.response?.data?.message ||
          "The requested job could not be found."
        }
        onRetry={query.refetch}
      />
    );
  }

  const canEdit = job.canEdit;
  const canManage = job.canManageLifecycle;
  const canDelete = job.canDelete;

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/app/jobs/manage"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Job Management
          </Link>
          <p className="mt-3 text-sm font-medium text-brand">JOB VACANCY DETAILS</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">{job.title}</h1>
            <JobStatusBadge status={job.status} />
            {job.moderationStatus && (
              <JobModerationBadge moderationStatus={job.moderationStatus} />
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {job.company?.name} · {job.department || job.category || "General"} ·
            Created {formatDate(job.createdAt)}
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {job.status === "PUBLISHED" && (
            <Link
              to={`/app/jobs/${job.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye size={15} />
              Public Preview
            </Link>
          )}

          <Link
            to={`/app/jobs/${job.id}/publishing`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ShieldCheck size={15} />
            Publishing Status
          </Link>

          {canEdit && (
            <Link
              to={`/app/jobs/${job.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={15} />
              Edit Job
            </Link>
          )}

          {canManage && ["DRAFT", "REJECTED"].includes(job.status) && (
            <Button
              type="button"
              onClick={() => setConfirmAction("publish")}
              className="gap-1.5 py-2.5 text-xs"
            >
              <Send size={14} />
              Publish Job
            </Button>
          )}

          {canManage && job.status === "PUBLISHED" && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => lifecycleMutation.mutate("pause")}
              disabled={lifecycleMutation.isPending}
              className="gap-1.5 border-orange-200 py-2.5 text-xs text-orange-700 hover:bg-orange-50"
            >
              <PauseCircle size={14} />
              Pause
            </Button>
          )}

          {canManage && job.status === "PAUSED" && (
            <Button
              type="button"
              onClick={() => lifecycleMutation.mutate("resume")}
              disabled={lifecycleMutation.isPending}
              className="gap-1.5 bg-emerald-600 py-2.5 text-xs hover:bg-emerald-700"
            >
              <PlayCircle size={14} />
              Resume
            </Button>
          )}

          {canManage &&
            ["PUBLISHED", "PAUSED", "EXPIRED"].includes(job.status) && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmAction("close")}
                className="gap-1.5 py-2.5 text-xs"
              >
                <Lock size={14} />
                Close
              </Button>
            )}

          {canManage &&
            ["DRAFT", "CLOSED", "EXPIRED", "REJECTED"].includes(job.status) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmAction("archive")}
                className="gap-1.5 py-2.5 text-xs"
              >
                <Archive size={14} />
                Archive
              </Button>
            )}

          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmAction("delete")}
              className="gap-1.5 py-2.5 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* 1. Basic Information & 7. Salary Overview Bar */}
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
            <BriefcaseBusiness size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Employment & Mode</p>
            <p className="font-semibold text-slate-900">
              {job.employmentType} · {job.workMode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Experience Required</p>
            <p className="font-semibold text-slate-900">
              {formatExperienceRange(job)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">
              Salary ({job.discloseSalary ? "Public" : "Hidden"})
            </p>
            <p className="font-semibold text-slate-900">
              {formatSalaryRange({ ...job, discloseSalary: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <Users2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Openings & Deadline</p>
            <p className="font-semibold text-slate-900">
              {job.numberOfOpenings} openings · Due{" "}
              {formatDate(job.applicationDeadline)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Description, Responsibilities, Requirements, Skills */}
        <div className="space-y-6 lg:col-span-2">
          {/* 3. Job Description */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Job Description
            </h2>
            {job.summary && (
              <p className="mt-2 rounded-xl bg-slate-50 p-3.5 text-sm font-medium text-slate-700">
                {job.summary}
              </p>
            )}
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
              {job.description}
            </p>
          </section>

          {/* 4. Responsibilities */}
          {job.responsibilities?.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Key Responsibilities
              </h2>
              <ul className="mt-4 space-y-2.5">
                {job.responsibilities.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-700"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-brand"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 5 & 6. Skills & Requirements */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Skills & Qualifications
            </h2>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Required Skills
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(job.requiredSkills || []).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-brand"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {job.preferredSkills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Preferred Skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.preferredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Minimum Education</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {job.minEducationLevel || "Any"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  Educational Qualification
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {job.educationalQualification || "—"}
                </p>
              </div>
            </div>

            {job.experienceDescription && (
              <div>
                <p className="text-xs text-slate-400">Experience Details</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {job.experienceDescription}
                </p>
              </div>
            )}

            {job.additionalRequirements && (
              <div>
                <p className="text-xs text-slate-400">
                  Additional Requirements
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {job.additionalRequirements}
                </p>
              </div>
            )}
          </section>

          {/* 7. Benefits & Perks */}
          {(job.benefits?.length > 0 ||
            job.perks?.length > 0 ||
            job.additionalInfo) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Benefits, Perks & Additional Info
              </h2>
              {job.benefits?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Benefits
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {job.benefits.map((b) => (
                      <span
                        key={b}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.perks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Perks
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {job.perks.map((p) => (
                      <span
                        key={p}
                        className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-800"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {job.additionalInfo && (
                <p className="text-sm text-slate-700">{job.additionalInfo}</p>
              )}
            </section>
          )}
        </div>

        {/* Right Column: 2. Company Info, 8. Location, 9. Application Config, 10. Publishing Info */}
        <div className="space-y-6">
          {/* 2. Company Information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Company Information
            </h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-brand">
                {job.company?.logoUrl ? (
                  <img
                    src={job.company.logoUrl}
                    alt={job.company.name}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <Building2 size={22} />
                )}
              </div>
              <div>
                <Link
                  to={`/app/companies/${job.companyId}/dashboard`}
                  className="font-semibold text-slate-900 hover:text-brand"
                >
                  {job.company?.name}
                </Link>
                <div className="mt-1">
                  <CompanyStatusBadge status={job.company?.status} size="sm" />
                </div>
              </div>
            </div>
          </section>

          {/* 8. Location */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Location Details</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="flex items-center gap-2">
                <MapPin size={15} className="text-slate-400" />
                {[job.city, job.state, job.country].filter(Boolean).join(", ") ||
                  job.location ||
                  job.workMode}
              </p>
              {job.officeLocation && (
                <p className="text-xs text-slate-500">
                  Address: {job.officeLocation}
                </p>
              )}
              {job.pincode && (
                <p className="text-xs text-slate-500">Pincode: {job.pincode}</p>
              )}
            </div>
          </section>

          {/* 9. Application Configuration */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Application Configuration
            </h2>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Application Deadline</span>
                <span className="font-medium text-slate-800">
                  {formatDate(job.applicationDeadline)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Allow After Deadline</span>
                <span className="font-medium text-slate-800">
                  {job.allowAfterDeadline ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resume Required</span>
                <span className="font-medium text-slate-800">
                  {job.requireResume ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cover Letter Required</span>
                <span className="font-medium text-slate-800">
                  {job.requireCoverLetter ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Max Applications</span>
                <span className="font-medium text-slate-800">
                  {job.maxApplications || "Unlimited"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Screening Questions</span>
                <span className="font-medium text-slate-800">
                  {job.applicationQuestions?.length || 0}
                </span>
              </div>
            </div>
          </section>

          {/* 10. Publishing & Audit Information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Publishing & Audit Trail
            </h2>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Created By</span>
                <span className="font-medium text-slate-800">
                  {job.createdBy?.fullName || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Created At</span>
                <span className="font-medium text-slate-800">
                  {formatDate(job.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Published At</span>
                <span className="font-medium text-slate-800">
                  {formatDate(job.publishedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Updated</span>
                <span className="font-medium text-slate-800">
                  {formatDate(job.updatedAt)}
                </span>
              </div>
              {job.updatedBy?.fullName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Updated By</span>
                  <span className="font-medium text-slate-800">
                    {job.updatedBy.fullName}
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={`Confirm ${confirmAction} job?`}
        description={
          confirmAction === "delete"
            ? `Permanently delete "${job.title}"? This action cannot be undone.`
            : confirmAction === "close"
            ? `Close "${job.title}"? It will stop accepting new candidate applications.`
            : `Proceed to ${confirmAction} "${job.title}"?`
        }
        confirmLabel="Confirm"
        variant={
          confirmAction === "delete" || confirmAction === "close"
            ? "danger"
            : "primary"
        }
        isPending={lifecycleMutation.isPending}
        onClose={() => setConfirmAction(null)}
        onConfirm={() =>
          confirmAction && lifecycleMutation.mutate(confirmAction)
        }
      />
    </div>
  );
}
