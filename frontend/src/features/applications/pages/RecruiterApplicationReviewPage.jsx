import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  BriefcaseBusiness,
  Calendar,
  Link2,
  FileText,
  HelpCircle,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { applicationsApi } from "../api/applicationsApi";
import { APPLICATION_STATUS_META } from "../schema/applicationSchemas";
import { ApplicationStatusBadge } from "../components/ApplicationStatusBadge";
import { ApplicationTimeline } from "../components/ApplicationTimeline";
import { ResumeViewer } from "../components/ResumeViewer";
import { StatusUpdateDialog } from "../components/StatusUpdateDialog";
import { RecruiterNotes } from "../components/RecruiterNotes";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { formatDate } from "../../../utils/formatters";

export function RecruiterApplicationReviewPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [statusDialogState, setStatusDialogState] = useState({
    open: false,
    targetStatus: "",
  });

  const query = useQuery({
    queryKey: ["applications", "recruiter-detail", id],
    queryFn: () => applicationsApi.getRecruiterApplicationById(id),
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: (payload) => applicationsApi.updateApplicationStatus(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(
        res?.data?.message || "Application status updated successfully."
      );
      setStatusDialogState({ open: false, targetStatus: "" });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to update application status."
      );
    },
  });

  const noteMutation = useMutation({
    mutationFn: ({ note }) => applicationsApi.addRecruiterNote(id, { note }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(res?.data?.message || "Internal note added.");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to save internal note."
      );
    },
  });

  if (query.isPending) {
    return <LoadingState title="Loading candidate application for review" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load application"
        message={
          query.error?.response?.data?.message ||
          "You may not have permission to access this application."
        }
        onRetry={query.refetch}
      />
    );
  }

  const app = query.data?.data?.application ?? query.data?.application;
  if (!app) return null;

  const candidate = app.candidate || {};
  const profile = candidate.candidateProfile || {};
  const snapshot = app.candidateSnapshot || {};
  const candidateName =
    candidate.fullName || snapshot.fullName || "Candidate";
  const candidateEmail = candidate.email || snapshot.email || "";
  const candidatePhone = profile.phone || snapshot.phone || null;
  const candidateHeadline =
    profile.headline ||
    snapshot.headline ||
    profile.currentJobTitle ||
    snapshot.currentJobTitle ||
    null;
  const candidateLocation =
    [profile.city, profile.state, profile.country]
      .filter(Boolean)
      .join(", ") ||
    profile.location ||
    snapshot.location ||
    null;
  const candidateExperience =
    app.candidateExperience ?? profile.yearsOfExperience ?? null;
  const skills = app.candidateSkills || profile.skills || [];

  const allowedStatuses = app.allowedNextStatuses || [];
  const answers = Array.isArray(app.answers) ? app.answers : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/recruiter/applications"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Application Management
        </Link>

        {app.job?.id && (
          <Link
            to={`/app/jobs/${app.job.id}/manage`}
            className="text-xs font-semibold text-brand hover:underline"
          >
            View Job Requisition →
          </Link>
        )}
      </div>

      {/* Candidate & Stage Hero Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-blue-100 text-2xl font-bold text-brand">
              {candidateName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-950">
                  {candidateName}
                </h1>
                <ApplicationStatusBadge status={app.status} />
              </div>
              {candidateHeadline && (
                <p className="mt-0.5 text-sm font-medium text-slate-700">
                  {candidateHeadline}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Applied for{" "}
                <strong className="text-slate-800">
                  {app.job?.title || app.jobSnapshot?.title}
                </strong>{" "}
                at{" "}
                <strong className="text-slate-800">
                  {app.company?.name || app.jobSnapshot?.companyName}
                </strong>{" "}
                on {formatDate(app.appliedAt)}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                {candidateEmail && (
                  <a
                    href={`mailto:${candidateEmail}`}
                    className="inline-flex items-center gap-1 hover:text-brand"
                  >
                    <Mail size={13} className="text-slate-400" />
                    {candidateEmail}
                  </a>
                )}
                {candidatePhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    {candidatePhone}
                  </span>
                )}
                {candidateLocation && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} className="text-slate-400" />
                    {candidateLocation}
                  </span>
                )}
                {candidateExperience != null && (
                  <span className="inline-flex items-center gap-1">
                    <BriefcaseBusiness size={13} className="text-slate-400" />
                    {candidateExperience} yrs experience
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stage Transition Buttons */}
          {allowedStatuses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {allowedStatuses.map((target) => {
                const isReject = target === "REJECTED";
                return (
                  <button
                    key={target}
                    type="button"
                    onClick={() =>
                      setStatusDialogState({ open: true, targetStatus: target })
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      isReject
                        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-brand text-white hover:bg-blue-700"
                    }`}
                  >
                    {isReject
                      ? "Reject Application"
                      : `Move to ${APPLICATION_STATUS_META[target]?.label || target}`}
                  </button>
                );
              })}

              <Button
                type="button"
                variant="secondary"
                className="gap-1.5 py-2 text-xs"
                onClick={() =>
                  setStatusDialogState({
                    open: true,
                    targetStatus: allowedStatuses[0],
                  })
                }
              >
                <SlidersHorizontal size={14} />
                Update Status
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Two-Column Review Workspace */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Submitted Resume Viewer & Authorized Download */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-brand" />
              <h2 className="text-lg font-semibold text-slate-900">
                Submitted Resume / CV
              </h2>
            </div>

            <ResumeViewer
              applicationId={app.id}
              hasResume={app.hasResume}
              fileName={app.resumeFileName}
              mimeType={app.resumeMimeType}
              fileSize={app.resumeFileSize}
              asRecruiter
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
                No cover letter provided.
              </p>
            )}
          </section>

          {/* Screening Question Responses */}
          {answers.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-brand" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Screening Question Responses
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

          {/* Application Timeline & Audit Trail */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Application Timeline & Audit History
            </h2>
            <ApplicationTimeline
              currentStatus={app.status}
              history={app.statusHistory || []}
              rejectionReason={app.rejectionReason}
              withdrawalReason={app.withdrawalReason}
              withdrawnAt={app.withdrawnAt}
              showInternalNotes
            />
          </section>
        </div>

        {/* Right Sidebar: Candidate Profile Overview & Confidential Recruiter Notes */}
        <div className="space-y-6">
          {/* Candidate Profile Details */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <UserRound size={18} className="text-brand" />
              <h2 className="text-base font-semibold text-slate-900">
                Candidate Profile Details
              </h2>
            </div>

            {profile.bio && (
              <p className="text-xs leading-5 text-slate-600">{profile.bio}</p>
            )}

            <div className="space-y-2.5 border-t border-slate-100 pt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Role:</span>
                <span className="font-semibold text-slate-800">
                  {profile.currentJobTitle || snapshot.currentJobTitle || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Company:</span>
                <span className="font-semibold text-slate-800">
                  {profile.currentCompany || snapshot.currentCompany || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Experience:</span>
                <span className="font-semibold text-slate-800">
                  {candidateExperience != null
                    ? `${candidateExperience} years`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Applied Date:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(app.appliedAt)}
                </span>
              </div>
            </div>

            {/* Candidate Skills */}
            {skills.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500">
                  Skills & Technologies
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {skills.map((sk) => (
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

            {/* External Profile Links */}
            {(profile.linkedinUrl ||
              profile.githubUrl ||
              profile.portfolioUrl ||
              snapshot.linkedinUrl ||
              snapshot.githubUrl ||
              snapshot.portfolioUrl) && (
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500">
                  Online Profiles
                </p>
                {(profile.linkedinUrl || snapshot.linkedinUrl) && (
                  <a
                    href={profile.linkedinUrl || snapshot.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                  >
                    <Link2 size={13} /> LinkedIn Profile
                  </a>
                )}
                {(profile.githubUrl || snapshot.githubUrl) && (
                  <a
                    href={profile.githubUrl || snapshot.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                  >
                    <Link2 size={13} /> GitHub Profile
                  </a>
                )}
                {(profile.portfolioUrl || snapshot.portfolioUrl) && (
                  <a
                    href={profile.portfolioUrl || snapshot.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                  >
                    <Link2 size={13} /> Portfolio Website
                  </a>
                )}
              </div>
            )}
          </section>

          {/* Confidential Recruiter Notes */}
          <RecruiterNotes
            notes={app.recruiterNotes || []}
            isAdding={noteMutation.isPending}
            onAddNote={(note, onClear) =>
              noteMutation.mutate(
                { note },
                {
                  onSuccess: () => onClear && onClear(),
                }
              )
            }
          />
        </div>
      </div>

      <StatusUpdateDialog
        open={statusDialogState.open}
        application={app}
        initialTargetStatus={statusDialogState.targetStatus}
        isPending={statusMutation.isPending}
        onClose={() =>
          setStatusDialogState({ open: false, targetStatus: "" })
        }
        onConfirm={(payload) => statusMutation.mutate(payload)}
      />
    </div>
  );
}
