import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Building2, Globe, FileText, Layers, Users2, MapPin } from "lucide-react";

import { companySchema, companySizeOptions } from "../schema/recruiterSchema";
import { recruiterApi } from "../api/recruiterApi";
import { Button } from "../../../components/ui/Button";
import { ProfileField, profileInputClass } from "../../candidate-profile/components/ProfileField";

/**
 * Modal for creating or editing a company.
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - company?: existing company object (if editing)
 *  - onSuccess?: (company) => void  -- called after save
 */
export function CompanyModal({ open, onClose, company, onSuccess }) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(company?.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: toDefaults(company),
  });

  // Re-populate when the modal is opened for a different company
  useEffect(() => {
    reset(toDefaults(company));
  }, [company, open, reset]);

  const mutation = useMutation({
    mutationFn: (values) =>
      isEditing
        ? recruiterApi.updateCompany(company.id, clean(values))
        : recruiterApi.createCompany(clean(values)),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recruiter", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success(isEditing ? "Company updated!" : "Company created!");
      const saved = data?.data?.company ?? data?.company ?? data;
      onSuccess?.(saved);
      onClose();
    },
    onError: (err) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to save company. Please try again."
      ),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-brand">
              <Building2 size={18} />
            </div>
            <h2 id="company-modal-title" className="font-semibold text-slate-900">
              {isEditing ? "Edit company" : "Add new company"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          id="company-form"
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          noValidate
          className="space-y-4 p-6"
        >
          {/* Company name */}
          <ProfileField label="Company name *" error={errors.name?.message}>
            <div className="relative">
              <Building2
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="company-name"
                type="text"
                placeholder="Acme Corporation"
                className={`${profileInputClass} pl-9`}
                {...register("name")}
              />
            </div>
          </ProfileField>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Industry */}
            <ProfileField label="Industry" error={errors.industry?.message}>
              <div className="relative">
                <Layers
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="company-industry"
                  type="text"
                  placeholder="e.g. Software, Finance"
                  className={`${profileInputClass} pl-9`}
                  {...register("industry")}
                />
              </div>
            </ProfileField>

            {/* Company size */}
            <ProfileField label="Company size" error={errors.companySize?.message}>
              <div className="relative">
                <Users2
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  id="company-size"
                  className={`${profileInputClass} pl-9 appearance-none`}
                  {...register("companySize")}
                >
                  <option value="">Select size</option>
                  {companySizeOptions.map((s) => (
                    <option key={s} value={s}>
                      {s} employees
                    </option>
                  ))}
                </select>
              </div>
            </ProfileField>
          </div>

          {/* Website */}
          <ProfileField label="Website" error={errors.website?.message}>
            <div className="relative">
              <Globe
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="company-website"
                type="url"
                placeholder="https://company.com"
                className={`${profileInputClass} pl-9`}
                {...register("website")}
              />
            </div>
          </ProfileField>

          {/* Location */}
          <ProfileField label="Location" error={errors.location?.message}>
            <div className="relative">
              <MapPin
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="company-location"
                type="text"
                placeholder="e.g. New York, USA"
                className={`${profileInputClass} pl-9`}
                {...register("location")}
              />
            </div>
          </ProfileField>

          {/* Description */}
          <ProfileField label="About the company" error={errors.description?.message}>
            <div className="relative">
              <FileText
                size={15}
                className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
              />
              <textarea
                id="company-description"
                rows={4}
                placeholder="Describe what the company does…"
                className={`${profileInputClass} pl-9 resize-none`}
                {...register("description")}
              />
            </div>
          </ProfileField>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            form="company-form"
            type="submit"
            disabled={mutation.isPending || !isDirty}
          >
            {mutation.isPending
              ? "Saving…"
              : isEditing
              ? "Save changes"
              : "Create company"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────
function toDefaults(c) {
  return {
    name: c?.name ?? "",
    website: c?.website ?? "",
    description: c?.description ?? "",
    industry: c?.industry ?? "",
    companySize: c?.companySize ?? "",
    location: c?.location ?? "",
  };
}

function clean(v) {
  return {
    name: v.name,
    website: v.website || null,
    description: v.description || null,
    industry: v.industry || null,
    companySize: v.companySize || null,
    location: v.location || null,
  };
}
