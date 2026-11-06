import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  BriefcaseBusiness,
  Calendar,
  ExternalLink,
  RotateCcw,
  FileText,
  HelpCircle,
  Globe,
} from "lucide-react";

import { applicationsApi } from "../api/applicationsApi";
import { ApplicationStatusBadge } from "../components/ApplicationStatusBadge";
import { ApplicationTimeline } from "../components/ApplicationTimeline";
import { ResumeViewer } from "../components/ResumeViewer";
import { WithdrawalDialog } from "../components/WithdrawalDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { formatDate } from "../../../utils/formatters";

export function CandidateApplicationDetailsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const query = useQuery({
    queryKey: ["applications", "candidate-detail", id],
    queryFn: () => applicationsApi.getCandidateApplicationById(id),
    retry: false,
  });

  const withdrawMutation = useMutation({
    mutationFn: ({ reason }) =>
      applicationsApi.withdrawApplication(id, { reason }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(
        res?.data?.message || "Application withdrawn successfully."
      );
      setConfirmWithdraw(false);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to withdraw application."
      );
    },
  });

  if (query.isPending) {
    return <LoadingState title="Loading application details" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load application"
        message={
          query.error?.response?.data?.message ||
          "This application could not be found or you do not have permission to view it."
        }
        onRetry={query.refetch}
      />
    );
  }

  const app = query.data?.data?.application ?? query.data?.application;
  if (!app) return null;

  const job = app.job || {};
  const company = app.company || {};
  const jobTitle = job.title || app.jobSnapshot?.title || "Job Vacancy";
  const companyName =
    company.name || app.jobSnapshot?.companyName || "Company";
  const companyLogo =
    company.logoUrl || app.jobSnapshot?.companyLogoUrl || null;
  const locationDisplay =
    [job.city, job.state, job.country].filter(Boolean).join(", ") ||
    job.location ||
    app.jobSnapshot?.location ||
    job.workMode ||
    "Location not specified";

  const answers = Array.isArray(app.answers) ? app.answers : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/app/applications"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to My Applications
        </Link>
      </div>

      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-brand">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Building2 size={30} />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-950">{jobTitle}</h1>
                <ApplicationStatusBadge status={app.status} />
              </div>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {companyName}
                {job.department ? ` · ${job.department}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} className="text-slate-400" />
                  {locationDisplay}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BriefcaseBusiness size={14} className="text-slate-400" />
                  {job.employmentType || app.jobSnapshot?.employmentType} ·{" "}
                  {job.workMode || app.jobSnapshot?.workMode}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} className="text-slate-400" />
                  Applied on {formatDate(app.appliedAt)}
                </span>
                <span>Last updated {formatDate(app.lastStatusUpdatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={`/app/jobs/${app.jobId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink size={14} />
              View Job Posting
            </Link>

            {app.canWithdraw && (
              <button
                type="button"
                onClick={() => setConfirmWithdraw(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <RotateCcw size={14} />
                Withdraw Application
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Application Progress Timeline */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Application Progress Timeline
          </h2>
          <p className="text-xs text-slate-500">
            Track your application stage from submission through hiring decision.
          </p>
        </div>

        <ApplicationTimeline
          currentStatus={app.status}
          history={app.statusHistory || []}
          rejectionReason={app.rejectionReason}
          withdrawalReason={app.withdrawalReason}
          withdrawnAt={app.withdrawnAt}
          showInternalNotes={false}
        />
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Submitted Resume */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-brand" />
              <h2 className="text-lg font-semibold text-slate-900">
                Submitted Resume
              </h2>
            </div>
            <ResumeViewer
              applicationId={app.id}
              hasResume={app.hasResume}
              fileName={app.resumeFileName}
              mimeType={app.resumeMimeType}
              fileSize={app.resumeFileSize}
              asRecruiter={false}
            />
          </section>

          {/* Cover Letter */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Cover Letter
            </h2>
            {app.coverLetter ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                {app.coverLetter}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                No cover letter was included with this application.
              </p>
            )}
          </section>

          {/* Screening Question Answers */}
          {answers.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-brand" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Submitted Screening Answers
                </h2>
              </div>
              <div className="space-y-3">
                {answers.map((item, idx) => (
                  <div
                    key={item.questionId || idx}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold text-slate-700">
                      {idx + 1}. {item.question}
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-slate-900">
                      {Array.isArray(item.answer)
                        ? item.answer.join(", ")
                        : String(item.answer || "—")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Additional Information */}
          {app.additionalInformation && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Additional Information
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                {app.additionalInformation}
              </p>
            </section>
          )}
        </div>

        {/* Right Sidebar: Company & Submitted Snapshot */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Company Information
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {companyName}
            </p>
            {company.industry && (
              <p className="mt-0.5 text-xs text-brand">
                {company.industry}
                {company.companySize
                  ? ` · ${company.companySize} employees`
                  : ""}
              </p>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
              >
                <Globe size={13} />
                Company Website
              </a>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h2 className="font-semibold text-slate-900">
              Application Snapshot
            </h2>
            <div className="text-xs text-slate-600 space-y-2">
              <p>
                <span className="text-slate-400">Applicant Name:</span>{" "}
                <strong className="text-slate-900">
                  {app.candidateSnapshot?.fullName || "You"}
                </strong>
              </p>
              <p>
                <span className="text-slate-400">Experience at Submission:</span>{" "}
                <strong className="text-slate-900">
                  {app.candidateExperience != null
                    ? `${app.candidateExperience} years`
                    : "Not specified"}
                </strong>
              </p>
            </div>
            {app.candidateSkills?.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-slate-400">Submitted Skills:</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {app.candidateSkills.map((sk) => (
                    <span
                      key={sk}
                      className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <WithdrawalDialog
        open={confirmWithdraw}
        jobTitle={jobTitle}
        companyName={companyName}
        isPending={withdrawMutation.isPending}
        onClose={() => setConfirmWithdraw(false)}
        onConfirm={({ reason }) => withdrawMutation.mutate({ reason })}
      />
    </div>
  );
}
