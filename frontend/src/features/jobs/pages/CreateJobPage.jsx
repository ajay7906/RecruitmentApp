import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Building2, Plus } from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import { companiesApi } from "../../companies/api/companiesApi";
import { JobForm } from "../components/JobForm";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";

export function CreateJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedCompanyId = searchParams.get("companyId") || "";
  const [publishAfterSave, setPublishAfterSave] = useState(false);

  const companiesQuery = useQuery({
    queryKey: ["companies", "my-select"],
    queryFn: () => companiesApi.getMyCompanies({ limit: 50 }),
  });

  const companies =
    companiesQuery.data?.data?.companies ??
    companiesQuery.data?.companies ??
    [];

  const defaultCompanyId =
    preselectedCompanyId ||
    companies.find((c) => c.status === "APPROVED")?.id ||
    companies[0]?.id ||
    "";

  const createMutation = useMutation({
    mutationFn: async ({ payload, shouldPublish }) => {
      const createdRes = await jobsApi.createJob(payload);
      const job = createdRes?.data?.job ?? createdRes?.job;

      if (shouldPublish && job?.id) {
        const company = companies.find((c) => c.id === payload.companyId);
        const submitForApproval =
          company?.status !== "APPROVED" || Boolean(payload.requireAdminApproval);
        const pubRes = await jobsApi.publishJob(job.id, { submitForApproval });
        return {
          job: pubRes?.data?.job ?? pubRes?.job ?? job,
          published: true,
          message: pubRes?.data?.message || "Job published!",
        };
      }
      return { job, published: false };
    },
    onSuccess: ({ job, published, message }) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success(
        published ? message : "Job vacancy saved as draft!"
      );
      if (job?.id) {
        navigate(`/app/jobs/${job.id}/manage`, { replace: true });
      } else {
        navigate("/app/jobs/manage", { replace: true });
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          "Could not create job vacancy. Please check your inputs."
      );
    },
    onSettled: () => {
      setPublishAfterSave(false);
    },
  });

  if (companiesQuery.isPending) {
    return <LoadingState title="Loading your associated companies" />;
  }

  if (companiesQuery.isError) {
    return (
      <ErrorState
        title="Could not load companies"
        message={
          companiesQuery.error?.response?.data?.message ||
          "Failed to load companies."
        }
        onRetry={companiesQuery.refetch}
      />
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <Building2 className="mx-auto text-slate-400" size={34} />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          Company Membership Required
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Every job vacancy must belong to a company. Register your company or
          join an existing company before creating a job.
        </p>
        <div className="mt-5">
          <Link
            to="/app/companies/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Register a Company
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-7">
        <Link
          to="/app/jobs/manage"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Job Management
        </Link>
        <p className="mt-3 text-sm font-medium text-brand">JOB MANAGEMENT</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Create a Job Vacancy
        </h1>
        <p className="mt-2 text-slate-500">
          Define role requirements, responsibilities, compensation, and
          application settings. Jobs start in DRAFT status until published.
        </p>
      </div>

      <JobForm
        companies={companies}
        defaultCompanyId={defaultCompanyId}
        submitLabel="Save as Draft"
        isSaving={createMutation.isPending && !publishAfterSave}
        isPublishing={createMutation.isPending && publishAfterSave}
        onSubmit={(payload) => {
          setPublishAfterSave(false);
          createMutation.mutate({ payload, shouldPublish: false });
        }}
        onSaveAndPublish={(payload) => {
          setPublishAfterSave(true);
          createMutation.mutate({ payload, shouldPublish: true });
        }}
      />
    </div>
  );
}
