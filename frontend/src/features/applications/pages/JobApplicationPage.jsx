import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
} from "lucide-react";

import { jobsApi } from "../../jobs/api/jobsApi";
import { profileApi } from "../../candidate-profile/api/profileApi";
import { applicationsApi } from "../api/applicationsApi";
import { ApplicationForm } from "../components/ApplicationForm";
import { ApplicationStatusBadge } from "../components/ApplicationStatusBadge";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { useAuthStore } from "../../../stores/authStore";
import { formatDate } from "../../../utils/formatters";

export function JobApplicationPage() {
  const { id: jobId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const jobQuery = useQuery({
    queryKey: ["jobs", "public-detail", jobId],
    queryFn: () => jobsApi.getPublicById(jobId),
    retry: false,
  });

  const profileQuery = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: profileApi.getMyProfile,
    retry: false,
  });

  const checkQuery = useQuery({
    queryKey: ["applications", "check", jobId],
    queryFn: () => applicationsApi.checkJobApplication(jobId),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (payload) => applicationsApi.submitApplication(payload),
    onSuccess: (res) => {
      const created = res?.data?.application ?? res?.application;
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidate", "profile"] });
      toast.success(
        res?.data?.message || "Application submitted successfully!"
      );
      if (created?.id) {
        navigate(`/app/applications/${created.id}`, { replace: true });
      } else {
        navigate("/app/applications", { replace: true });
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          "Could not submit your application. Please check the form and try again."
      );
    },
  });

  if (jobQuery.isPending || profileQuery.isPending || checkQuery.isPending) {
    return <LoadingState title="Preparing application form" />;
  }

  if (jobQuery.isError) {
    return (
      <ErrorState
        title="Job unavailable for application"
        message={
          jobQuery.error?.response?.data?.message ||
          "This job vacancy may have closed or expired."
        }
        onRetry={jobQuery.refetch}
      />
    );
  }

  const job = jobQuery.data?.data?.job ?? jobQuery.data?.job;
  const candidateProfile =
    profileQuery.data?.data?.profile ?? profileQuery.data?.profile ?? {};
  const existingCheck = checkQuery.data?.data ?? checkQuery.data ?? {};

  if (!job) return null;

  const locationDisplay =
    [job.city, job.state, job.country].filter(Boolean).join(", ") ||
    job.location ||
    job.workMode;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          to={`/app/jobs/${job.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Job Details
        </Link>
      </div>

      {/* Job Context Banner */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-brand">
              {job.company?.logoUrl ? (
                <img
                  src={job.company.logoUrl}
                  alt={job.company.name}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Building2 size={26} />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                JOB APPLICATION
              </p>
              <h1 className="mt-0.5 text-2xl font-bold text-slate-950">
                {job.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {job.company?.name}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} />
                  {locationDisplay}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BriefcaseBusiness size={13} />
                  {job.employmentType} · {job.workMode}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Already Applied Guard */}
      {existingCheck.hasApplied && existingCheck.application ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-8 text-center">
          <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">
            You have already applied for this position
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Submitted on {formatDate(existingCheck.application.appliedAt)} ·{" "}
            Current status:{" "}
          </p>
          <div className="mt-2 flex justify-center">
            <ApplicationStatusBadge status={existingCheck.application.status} />
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to={`/app/applications/${existingCheck.application.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Eye size={16} />
              View My Application
            </Link>
            <Link
              to="/app/applications"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Go to My Applications
            </Link>
          </div>
        </div>
      ) : !job.canApply ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
          This job vacancy is no longer accepting new applications.
        </div>
      ) : (
        <ApplicationForm
          job={job}
          candidateProfile={candidateProfile}
          user={user}
          isSubmitting={submitMutation.isPending}
          onSubmitApplication={(payload) => submitMutation.mutate(payload)}
          onCancel={() => navigate(`/app/jobs/${job.id}`)}
        />
      )}
    </div>
  );
}
