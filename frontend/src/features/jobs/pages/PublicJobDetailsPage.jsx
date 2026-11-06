import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  Wallet,
  Users2,
  CheckCircle2,
  Globe,
  Send,
  FileCheck2,
  Eye,
} from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import { applicationsApi } from "../../applications/api/applicationsApi";
import { ApplicationStatusBadge } from "../../applications/components/ApplicationStatusBadge";
import { formatSalaryRange, formatExperienceRange } from "../schema/jobSchemas";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { useAuthStore } from "../../../stores/authStore";
import { formatDate } from "../../../utils/formatters";

export function PublicJobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const locationObj = useLocation();
  const user = useAuthStore((s) => s.user);
  const isPublicRoute = !locationObj.pathname.startsWith("/app");
  const backPath = isPublicRoute ? "/jobs" : "/app/jobs";

  const query = useQuery({
    queryKey: ["jobs", "public-detail", id],
    queryFn: () => jobsApi.getPublicById(id),
    retry: false,
  });

  const checkAppQuery = useQuery({
    queryKey: ["applications", "check", id],
    queryFn: () => applicationsApi.checkJobApplication(id),
    enabled: Boolean(user && user.role === "candidate"),
    retry: false,
  });

  if (query.isPending) return <LoadingState title="Loading job details" />;
  if (query.isError) {
    return (
      <div className={isPublicRoute ? "mx-auto max-w-5xl px-5 py-10" : ""}>
        <ErrorState
          title="Job vacancy unavailable"
          message={
            query.error?.response?.data?.message ||
            "This job may have been closed, paused, or expired."
          }
          onRetry={query.refetch}
        />
      </div>
    );
  }

  const job = query.data?.data?.job ?? query.data?.job;
  if (!job) return null;

  const existingAppData = checkAppQuery.data?.data ?? checkAppQuery.data ?? {};
  const hasApplied = Boolean(existingAppData.hasApplied);
  const existingApplication = existingAppData.application || null;

  const locationDisplay =
    [job.city, job.state, job.country].filter(Boolean).join(", ") ||
    job.location ||
    job.workMode;

  function handleApplyClick() {
    if (!user) {
      toast.info("Please sign in as a candidate to apply for this position.");
      navigate("/login", { state: { from: { pathname: `/app/jobs/${id}/apply` } } });
      return;
    }
    if (user.role !== "candidate") {
      toast.info("Only candidate accounts can submit job applications.");
      return;
    }
    if (hasApplied && existingApplication) {
      navigate(`/app/applications/${existingApplication.id}`);
      return;
    }
    navigate(`/app/jobs/${id}/apply`);
  }

  return (
    <div className={isPublicRoute ? "mx-auto max-w-6xl px-5 py-10 lg:px-8" : ""}>
      <div className="mb-6">
        <Link
          to={backPath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Job Listings
        </Link>
      </div>

      {/* Hero Card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-brand">
              {job.company?.logoUrl ? (
                <img
                  src={job.company.logoUrl}
                  alt={job.company.name}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Building2 size={30} />
              )}
            </div>
            <div>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-0.5 text-xs font-semibold text-brand">
                {job.workMode} · {job.employmentType}
              </span>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
                {job.title}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {job.company?.name}
                {job.department ? ` · ${job.department}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {hasApplied && existingApplication ? (
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2">
                  <ApplicationStatusBadge
                    status={existingApplication.status}
                    size="sm"
                  />
                  <Link
                    to={`/app/applications/${existingApplication.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Eye size={16} />
                    View My Application
                  </Link>
                </div>
                <p className="text-xs text-emerald-700 font-medium">
                  Applied on {formatDate(existingApplication.appliedAt)}
                </p>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={!job.canApply}
                  onClick={handleApplyClick}
                  className="gap-2 px-6 py-3"
                >
                  <Send size={16} />
                  {job.canApply ? "Apply Now" : "Applications Closed"}
                </Button>
                {job.applicationDeadline && (
                  <p className="text-xs text-slate-500">
                    Apply by {formatDate(job.applicationDeadline)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Highlights Row */}
        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <MapPin size={17} className="shrink-0 text-slate-400" />
            <span>{locationDisplay}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <Clock size={17} className="shrink-0 text-slate-400" />
            <span>{formatExperienceRange(job)}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <Wallet size={17} className="shrink-0 text-slate-400" />
            <span>{formatSalaryRange(job)}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <Users2 size={17} className="shrink-0 text-slate-400" />
            <span>
              {job.numberOfOpenings}{" "}
              {job.numberOfOpenings === 1 ? "Opening" : "Openings"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Job Description */}
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

          {/* Responsibilities */}
          {job.responsibilities?.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Responsibilities
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

          {/* Requirements & Skills */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Requirements & Skills
            </h2>

            {job.requiredSkills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Required Skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.requiredSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-brand"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.preferredSkills?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Preferred Skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.preferredSkills.map((s) => (
                    <span
                      key={s}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
              {job.minEducationLevel && (
                <div>
                  <p className="text-xs text-slate-400">Education Level</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {job.minEducationLevel}
                  </p>
                </div>
              )}
              {job.educationalQualification && (
                <div>
                  <p className="text-xs text-slate-400">Qualification</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {job.educationalQualification}
                  </p>
                </div>
              )}
            </div>

            {job.experienceDescription && (
              <p className="text-sm leading-6 text-slate-700">
                {job.experienceDescription}
              </p>
            )}
            {job.additionalRequirements && (
              <p className="text-sm leading-6 text-slate-700">
                {job.additionalRequirements}
              </p>
            )}
          </section>

          {/* Benefits & Perks */}
          {(job.benefits?.length > 0 || job.perks?.length > 0) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Benefits & Perks
              </h2>
              <div className="flex flex-wrap gap-2">
                {[...(job.benefits || []), ...(job.perks || [])].map(
                  (item, idx) => (
                    <span
                      key={`${item}-${idx}`}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                    >
                      {item}
                    </span>
                  )
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Sidebar: Company Profile & Application Requirements */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              About {job.company?.name}
            </h2>
            {job.company?.industry && (
              <p className="mt-1 text-xs font-medium text-brand">
                {job.company.industry}
                {job.company.companySize
                  ? ` · ${job.company.companySize} employees`
                  : ""}
              </p>
            )}
            {job.company?.description && (
              <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-600">
                {job.company.description}
              </p>
            )}
            {job.company?.website && (
              <a
                href={job.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
              >
                <Globe size={14} />
                Visit company website
              </a>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <FileCheck2 size={18} className="text-brand" />
              <h2 className="font-semibold text-slate-900">
                Application Requirements
              </h2>
            </div>
            <div className="mt-4 space-y-2.5 text-sm text-slate-600">
              <p>
                • Resume / CV:{" "}
                <strong className="text-slate-900">
                  {job.requireResume ? "Required" : "Optional"}
                </strong>
              </p>
              <p>
                • Cover Letter:{" "}
                <strong className="text-slate-900">
                  {job.requireCoverLetter ? "Required" : "Optional"}
                </strong>
              </p>
              <p>
                • Published:{" "}
                <strong className="text-slate-900">
                  {formatDate(job.publishedAt)}
                </strong>
              </p>
              {job.applicationDeadline && (
                <p>
                  • Deadline:{" "}
                  <strong className="text-slate-900">
                    {formatDate(job.applicationDeadline)}
                  </strong>
                </p>
              )}
            </div>
            {job.applicationInstructions && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                <strong className="block text-slate-800">
                  Application Instructions:
                </strong>
                {job.applicationInstructions}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
