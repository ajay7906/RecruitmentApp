import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { companiesApi } from "../api/companiesApi";
import { CompanyForm } from "../components/CompanyForm";

export function CompanyRegistrationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitAfterSave, setSubmitAfterSave] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async ({ payload, requestApproval }) => {
      const createdRes = await companiesApi.registerCompany(payload);
      const company = createdRes?.data?.company ?? createdRes?.company;

      if (requestApproval && company?.id) {
        const submittedRes = await companiesApi.submitForApproval(company.id);
        return {
          company: submittedRes?.data?.company ?? submittedRes?.company ?? company,
          submitted: true,
        };
      }
      return { company, submitted: false };
    },
    onSuccess: ({ company, submitted }) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["recruiter", "profile"] });
      toast.success(
        submitted
          ? "Company registered and submitted for approval!"
          : "Company saved as draft!"
      );
      if (company?.id) {
        navigate(`/app/companies/${company.id}/dashboard`, { replace: true });
      } else {
        navigate("/app/companies", { replace: true });
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          "Failed to register company. Please check your details."
      );
    },
    onSettled: () => {
      setSubmitAfterSave(false);
    },
  });

  return (
    <div>
      <div className="mb-7">
        <Link
          to="/app/companies"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to My Companies
        </Link>
        <p className="mt-3 text-sm font-medium text-brand">COMPANY MANAGEMENT</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Register a Company
        </h1>
        <p className="mt-2 text-slate-500">
          Create your company profile. You will be assigned as the initial Company
          Owner and can save as a draft or submit directly for approval.
        </p>
      </div>

      <CompanyForm
        submitLabel="Save as Draft"
        isSaving={registerMutation.isPending && !submitAfterSave}
        isSubmittingApproval={registerMutation.isPending && submitAfterSave}
        onSubmit={(payload) => {
          setSubmitAfterSave(false);
          registerMutation.mutate({ payload, requestApproval: false });
        }}
        onSubmitAndRequestApproval={(payload) => {
          setSubmitAfterSave(true);
          registerMutation.mutate({ payload, requestApproval: true });
        }}
      />
    </div>
  );
}
