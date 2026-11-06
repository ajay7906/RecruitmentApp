import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { companiesApi } from "../api/companiesApi";
import { CompanyForm } from "../components/CompanyForm";
import { CompanyStatusBadge, CompanyRoleBadge } from "../components/CompanyStatusBadge";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";

export function EditCompanyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitAfterSave, setSubmitAfterSave] = useState(false);

  const query = useQuery({
    queryKey: ["companies", "detail", id],
    queryFn: () => companiesApi.getCompanyById(id),
    retry: false,
  });

  const company = query.data?.data?.company ?? query.data?.company;

  const updateMutation = useMutation({
    mutationFn: async ({ payload, requestApproval }) => {
      const updatedRes = await companiesApi.updateCompany(id, payload);
      const updated = updatedRes?.data?.company ?? updatedRes?.company;

      if (requestApproval) {
        const subRes = await companiesApi.submitForApproval(id);
        return {
          company: subRes?.data?.company ?? subRes?.company ?? updated,
          submitted: true,
        };
      }
      return { company: updated, submitted: false };
    },
    onSuccess: ({ company: saved, submitted }) => {
      queryClient.setQueryData(["companies", "detail", id], {
        success: true,
        data: { company: saved },
      });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["recruiter", "profile"] });
      toast.success(
        submitted
          ? "Company updated and submitted for approval!"
          : "Company profile updated!"
      );
      navigate(`/app/companies/${id}`);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to update company details."
      );
    },
    onSettled: () => {
      setSubmitAfterSave(false);
    },
  });

  if (query.isPending) return <LoadingState title="Loading company details" />;
  if (query.isError || !company) {
    return (
      <ErrorState
        title="Could not load company"
        message={
          query.error?.response?.data?.message ||
          "The requested company could not be found."
        }
        onRetry={query.refetch}
      />
    );
  }

  if (!company.canManage) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center">
        <ShieldAlert className="mx-auto text-amber-500" size={32} />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          Insufficient Permissions
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          Only the Company Owner or a Company Admin can edit company details.
        </p>
        <Link
          to={`/app/companies/${id}`}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
        >
          Back to Company Details
        </Link>
      </div>
    );
  }

  const canSubmitForApproval =
    company.status === "DRAFT" || company.status === "REJECTED";

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={`/app/companies/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Company Details
          </Link>
          <p className="mt-3 text-sm font-medium text-brand">EDIT COMPANY</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">{company.name}</h1>
            <CompanyStatusBadge status={company.status} />
            <CompanyRoleBadge role={company.myRole} />
          </div>
          <p className="mt-2 text-slate-500">
            Update official company details, branding, location, and compliance
            information.
          </p>
        </div>
      </div>

      {company.status === "REJECTED" && company.rejectionReason && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Previous submission was rejected:</p>
          <p className="mt-1">{company.rejectionReason}</p>
        </div>
      )}

      <CompanyForm
        initialData={company}
        submitLabel="Save changes"
        isSaving={updateMutation.isPending && !submitAfterSave}
        isSubmittingApproval={updateMutation.isPending && submitAfterSave}
        onSubmit={(payload) => {
          setSubmitAfterSave(false);
          updateMutation.mutate({ payload, requestApproval: false });
        }}
        onSubmitAndRequestApproval={
          canSubmitForApproval
            ? (payload) => {
                setSubmitAfterSave(true);
                updateMutation.mutate({ payload, requestApproval: true });
              }
            : undefined
        }
      />
    </div>
  );
}
