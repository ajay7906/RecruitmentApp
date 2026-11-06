import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import { companiesApi } from "../../companies/api/companiesApi";
import { JobForm } from "../components/JobForm";
import { JobStatusBadge } from "../components/JobStatusBadge";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";

export function EditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [publishAfterSave, setPublishAfterSave] = useState(false);

  const jobQuery = useQuery({
    queryKey: ["jobs", "detail", id],
    queryFn: () => jobsApi.getById(id),
    retry: false,
  });

  const companiesQuery = useQuery({
    queryKey: ["companies", "my-select"],
    queryFn: () => companiesApi.getMyCompanies({ limit: 50 }),
  });

  const job = jobQuery.data?.data?.job ?? jobQuery.data?.job;
  const companies =
    companiesQuery.data?.data?.companies ??
    companiesQuery.data?.companies ??
    (job?.company ? [job.company] : []);

  const updateMutation = useMutation({
    mutationFn: async ({ payload, shouldPublish }) => {
      const updatedRes = await jobsApi.updateJob(id, payload);
      const updated = updatedRes?.data?.job ?? updatedRes?.job;

      if (shouldPublish) {
        const submitForApproval =
          job?.company?.status !== "APPROVED" ||
          Boolean(payload.requireAdminApproval);
        const pubRes = await jobsApi.publishJob(id, { submitForApproval });
        return {
          job: pubRes?.data?.job ?? pubRes?.job ?? updated,
          published: true,
          message: pubRes?.data?.message || "Job updated and published!",
        };
      }
      return { job: updated, published: false };
    },
    onSuccess: ({ job: saved, published, message }) => {
      queryClient.setQueryData(["jobs", "detail", id], {
        success: true,
        data: { job: saved },
      });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(
        published ? message : "Job vacancy updated successfully!"
      );
      navigate(`/app/jobs/${id}/manage`);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to update job details."
      );
    },
    onSettled: () => {
      setPublishAfterSave(false);
    },
  });

  if (jobQuery.isPending) return <LoadingState title="Loading job details" />;
  if (jobQuery.isError || !job) {
    return (
      <ErrorState
        title="Could not load job"
        message={
          jobQuery.error?.response?.data?.message ||
          "The requested job could not be found."
        }
        onRetry={jobQuery.refetch}
      />
    );
  }

  if (!job.canEdit) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center">
        <ShieldAlert className="mx-auto text-amber-500" size={32} />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          Job Cannot Be Edited
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          {["CLOSED", "ARCHIVED"].includes(job.status)
            ? `Jobs in ${job.status} status cannot be modified.`
            : "Only the job creator, company admin, or company owner can edit this job."}
        </p>
        <Link
          to={`/app/jobs/${id}/manage`}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
        >
          Back to Job Details
        </Link>
      </div>
    );
  }

  const canPublishOption = ["DRAFT", "REJECTED"].includes(job.status);

  return (
    <div>
      <div className="mb-7">
        <Link
          to={`/app/jobs/${id}/manage`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Job Details
        </Link>
        <p className="mt-3 text-sm font-medium text-brand">EDIT JOB VACANCY</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900">{job.title}</h1>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="mt-2 text-slate-500">
          {job.status === "PUBLISHED"
            ? "Controlled editing: Saving changes will update the live listing without altering its PUBLISHED status."
            : "Update job details, requirements, and application configuration."}
        </p>
      </div>

      {job.status === "REJECTED" && job.rejectionReason && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Previous publishing request rejected:</p>
          <p className="mt-1">{job.rejectionReason}</p>
        </div>
      )}

      <JobForm
        initialData={job}
        companies={companies}
        defaultCompanyId={job.companyId}
        isEditing
        submitLabel="Save changes"
        isSaving={updateMutation.isPending && !publishAfterSave}
        isPublishing={updateMutation.isPending && publishAfterSave}
        onSubmit={(payload) => {
          setPublishAfterSave(false);
          updateMutation.mutate({ payload, shouldPublish: false });
        }}
        onSaveAndPublish={
          canPublishOption
            ? (payload) => {
                setPublishAfterSave(true);
                updateMutation.mutate({ payload, shouldPublish: true });
              }
            : undefined
        }
      />
    </div>
  );
}
