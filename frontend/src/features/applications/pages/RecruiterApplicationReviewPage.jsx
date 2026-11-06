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
  Link2,
  FileText,
  HelpCircle,
  SlidersHorizontal,
  UserRound,
  GraduationCap,
  FolderGit2,
  Award,
  CalendarPlus,
  Languages as LanguagesIcon,
} from "lucide-react";

import { applicationsApi } from "../api/applicationsApi";
import { interviewsApi } from "../../interviews/api/interviewsApi";
import { APPLICATION_STATUS_META } from "../schema/applicationSchemas";
import { ApplicationStatusBadge } from "../components/ApplicationStatusBadge";
import { ApplicationTimeline } from "../components/ApplicationTimeline";
import { ResumeViewer } from "../components/ResumeViewer";
import { StatusUpdateDialog } from "../components/StatusUpdateDialog";
import { RecruiterNotes } from "../components/RecruiterNotes";
import { InterviewRoundList } from "../../interviews/components/InterviewRoundList";
import { HiringDecisionDialog } from "../../interviews/components/HiringDecisionDialog";
import { EducationCard } from "../../candidate-profile/components/EducationCard";
import { ExperienceCard } from "../../candidate-profile/components/ExperienceCard";
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
  const [hiringDecisionOpen, setHiringDecisionOpen] = useState(false);

  const query = useQuery({
    queryKey: ["applications", "recruiter-detail", id],
    queryFn: () => applicationsApi.getRecruiterApplicationById(id),
    retry: false,
  });

  const decisionQuery = useQuery({
    queryKey: ["interviews", "application-rounds", id],
    queryFn: () => interviewsApi.getHiringDecision(id),
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

  const hiringDecisionMutation = useMutation({
    mutationFn: (payload) => interviewsApi.makeHiringDecision(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      setHiringDecisionOpen(false);
      toast.success(res?.message || "Hiring decision recorded.");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Could not record hiring decision."
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

  const structuredSkills = Array.isArray(candidate.skills)
    ? candidate.skills
    : Array.isArray(profile.skills)
    ? profile.skills
    : [];
  const skills =
    app.candidateSkills?.length > 0
      ? app.candidateSkills
      : structuredSkills.map((s) => (typeof s === "string" ? s : s.name));

  const educations = Array.isArray(candidate.education)
    ? candidate.education
    : Array.isArray(profile.educations)
    ? profile.educations
    : [];
  const experiences = Array.isArray(candidate.experience)
    ? candidate.experience
    : Array.isArray(profile.experiences)
    ? profile.experiences
    : [];
  const projects = Array.isArray(candidate.projects)
    ? candidate.projects
    : Array.isArray(profile.projects)
    ? profile.projects
    : [];
  const certifications = Array.isArray(candidate.certifications)
    ? candidate.certifications
    : Array.isArray(profile.certifications)
    ? profile.certifications
    : [];
  const languages = Array.isArray(candidate.languages)
    ? candidate.languages
    : Array.isArray(profile.languages)
    ? profile.languages
    : [];

  const allowedStatuses = app.allowedNextStatuses || [];
  const answers = Array.isArray(app.answers) ? app.answers : [];
  const interviewRounds = decisionQuery.data?.interviewRounds || [];

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

          {/* Quick Stage & Interview Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW"].includes(
              app.status
            ) && (
              <Link to={`/app/recruiter/interviews/new?applicationId=${app.id}`}>
                <Button type="button" className="gap-1.5 py-2 text-xs">
                  <CalendarPlus size={14} />
                  Schedule Interview
                </Button>
              </Link>
            )}

            {["SHORTLISTED", "INTERVIEW", "OFFERED"].includes(app.status) && (
              <Button
                type="button"
                variant="secondary"
                className="gap-1.5 py-2 text-xs"
                onClick={() => setHiringDecisionOpen(true)}
              >
                <Award size={14} />
                Hiring Decision
              </Button>
            )}

            {allowedStatuses.length > 0 && (
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
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Review Workspace */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Interview Rounds Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <InterviewRoundList
              rounds={interviewRounds}
              applicationId={app.id}
              canManage={Boolean(app.myCompanyRole)}
            />
          </section>

          {/* Submitted Resume Viewer & Authorized Download */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-brand" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Submitted Resume / CV
                </h2>
              </div>
              {app.resume?.version ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  Version v{app.resume.version}
                </span>
              ) : null}
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

          {/* Structured Work Experience History */}
          {experiences.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness size={18} className="text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Candidate Work Experience ({experiences.length})
                </h2>
              </div>
              <div className="space-y-3">
                {experiences.map((exp) => (
                  <ExperienceCard key={exp.id} experience={exp} />
                ))}
              </div>
            </section>
          )}

          {/* Structured Education History */}
          {educations.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Candidate Education ({educations.length})
                </h2>
              </div>
              <div className="space-y-3">
                {educations.map((edu) => (
                  <EducationCard key={edu.id} education={edu} />
                ))}
              </div>
            </section>
          )}

          {/* Candidate Projects & Certifications */}
          {(projects.length > 0 || certifications.length > 0) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              {projects.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <FolderGit2 size={18} className="text-purple-600" />
                    <h2 className="text-base font-semibold text-slate-900">
                      Projects ({projects.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5"
                      >
                        <h4 className="font-semibold text-sm text-slate-900">
                          {proj.title || proj.name}
                        </h4>
                        {proj.description && (
                          <p className="mt-1.5 text-xs text-slate-600">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {certifications.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Award size={18} className="text-amber-600" />
                    <h2 className="text-base font-semibold text-slate-900">
                      Certifications ({certifications.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {certifications.map((cert) => (
                      <div
                        key={cert.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                      >
                        <p className="font-semibold text-xs text-slate-900">
                          {cert.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {cert.issuingOrganization}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

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
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <UserRound size={18} className="text-brand" />
              <h2 className="text-base font-semibold text-slate-900">
                Candidate Profile Details
              </h2>
            </div>

            {(profile.careerSummary || profile.bio) && (
              <p className="text-xs leading-5 text-slate-600">
                {profile.careerSummary || profile.bio}
              </p>
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
              {profile.noticePeriod && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Notice Period:</span>
                  <span className="font-semibold text-slate-800">
                    {profile.noticePeriod}
                  </span>
                </div>
              )}
              {profile.expectedSalary != null && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Expected Salary:</span>
                  <span className="font-semibold text-slate-800">
                    {profile.salaryCurrency || "INR"}{" "}
                    {Number(profile.expectedSalary).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Applied Date:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(app.appliedAt)}
                </span>
              </div>
            </div>

            {/* Candidate Skills */}
            {structuredSkills.length > 0 ? (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500">
                  Structured Skills ({structuredSkills.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {structuredSkills.map((sk) => (
                    <span
                      key={sk.id || sk.name || sk}
                      className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand"
                    >
                      {typeof sk === "string" ? sk : sk.name}
                      {sk?.experienceYears != null
                        ? ` (${sk.experienceYears}y)`
                        : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : skills.length > 0 ? (
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
            ) : null}

            {/* Languages */}
            {languages.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <LanguagesIcon size={13} /> Languages
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {languages.map((lang) => (
                    <span
                      key={lang.id || lang.name || lang.language}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {lang.name || lang.language} (
                      {lang.proficiencyLevel || lang.proficiency})
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

      <HiringDecisionDialog
        open={hiringDecisionOpen}
        candidateName={candidateName}
        jobTitle={app.job?.title || app.jobSnapshot?.title}
        currentApplicationStatus={app.status}
        isPending={hiringDecisionMutation.isPending}
        onClose={() => setHiringDecisionOpen(false)}
        onConfirm={(payload) => hiringDecisionMutation.mutate(payload)}
      />
    </div>
  );
}
