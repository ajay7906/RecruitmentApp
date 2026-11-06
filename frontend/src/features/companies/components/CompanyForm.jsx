import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  Layers,
  Users2,
  Calendar,
  MapPin,
  FileText,
  Link2,
  ShieldCheck,
  Save,
  Send,
} from "lucide-react";

import {
  companyFormSchema,
  companySizeOptions,
  companyTypeOptions,
  toCompanyFormDefaults,
  cleanCompanyPayload,
} from "../schema/companySchemas";
import { ProfileSection } from "../../candidate-profile/components/ProfileSection";
import {
  ProfileField,
  profileInputClass,
} from "../../candidate-profile/components/ProfileField";
import { CompanyLogoUpload } from "./CompanyLogoUpload";
import { Button } from "../../../components/ui/Button";

export function CompanyForm({
  initialData,
  onSubmit,
  onSubmitAndRequestApproval,
  isSaving = false,
  isSubmittingApproval = false,
  submitLabel = "Save company",
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toCompanyFormDefaults(initialData),
  });

  useEffect(() => {
    if (initialData) {
      reset(toCompanyFormDefaults(initialData));
    }
  }, [initialData, reset]);

  function handleSave(values) {
    onSubmit(cleanCompanyPayload(values));
  }

  function handleSaveAndSubmit(values) {
    onSubmitAndRequestApproval?.(cleanCompanyPayload(values));
  }

  const busy = isSaving || isSubmittingApproval;

  return (
    <form
      id="company-management-form"
      onSubmit={handleSubmit(handleSave)}
      noValidate
      className="space-y-6"
    >
      {/* ── Brand & Identity ── */}
      <ProfileSection
        title="Company identity"
        description="Official company name, classification, and brand logo."
        icon={Building2}
      >
        <ProfileField
          label="Company logo"
          error={errors.logoUrl?.message}
          className="sm:col-span-2"
        >
          <Controller
            name="logoUrl"
            control={control}
            render={({ field }) => (
              <CompanyLogoUpload
                value={field.value}
                onChange={field.onChange}
                disabled={busy}
                error={errors.logoUrl?.message}
              />
            )}
          />
        </ProfileField>

        <ProfileField
          label="Company name *"
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <div className="relative">
            <Building2
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="e.g. Acme Technologies Pvt. Ltd."
              className={`${profileInputClass} pl-9`}
              {...register("name")}
            />
          </div>
        </ProfileField>

        <ProfileField label="Industry *" error={errors.industry?.message}>
          <div className="relative">
            <Layers
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="e.g. Information Technology, FinTech"
              className={`${profileInputClass} pl-9`}
              {...register("industry")}
            />
          </div>
        </ProfileField>

        <ProfileField label="Company type *" error={errors.companyType?.message}>
          <select
            className={`${profileInputClass} appearance-none`}
            {...register("companyType")}
          >
            <option value="">Select company type</option>
            {companyTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </ProfileField>

        <ProfileField label="Company size *" error={errors.companySize?.message}>
          <div className="relative">
            <Users2
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              className={`${profileInputClass} pl-9 appearance-none`}
              {...register("companySize")}
            >
              <option value="">Select company size</option>
              {companySizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} employees
                </option>
              ))}
            </select>
          </div>
        </ProfileField>

        <ProfileField label="Founded year" error={errors.foundedYear?.message}>
          <div className="relative">
            <Calendar
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="number"
              min="1800"
              max={new Date().getFullYear()}
              placeholder="e.g. 2018"
              className={`${profileInputClass} pl-9`}
              {...register("foundedYear")}
            />
          </div>
        </ProfileField>

        <ProfileField
          label="Company description *"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          <div className="relative">
            <FileText
              size={16}
              className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
            />
            <textarea
              rows={4}
              placeholder="Describe your company's mission, products, culture, and what makes it a great place to work..."
              className={`${profileInputClass} pl-9 resize-none`}
              {...register("description")}
            />
          </div>
        </ProfileField>
      </ProfileSection>

      {/* ── Contact & Online Presence ── */}
      <ProfileSection
        title="Contact & online presence"
        description="Official communication channels and public links."
        icon={Globe}
      >
        <ProfileField label="Company email *" error={errors.email?.message}>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              placeholder="careers@company.com"
              className={`${profileInputClass} pl-9`}
              {...register("email")}
            />
          </div>
        </ProfileField>

        <ProfileField
          label="Company contact number *"
          error={errors.contactNumber?.message}
        >
          <div className="relative">
            <Phone
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="tel"
              placeholder="+91 98765 43210"
              className={`${profileInputClass} pl-9`}
              {...register("contactNumber")}
            />
          </div>
        </ProfileField>

        <ProfileField label="Company website" error={errors.website?.message}>
          <div className="relative">
            <Globe
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="url"
              placeholder="https://www.company.com"
              className={`${profileInputClass} pl-9`}
              {...register("website")}
            />
          </div>
        </ProfileField>

        <ProfileField
          label="LinkedIn profile"
          error={errors.linkedinUrl?.message}
        >
          <div className="relative">
            <Link2
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="url"
              placeholder="https://linkedin.com/company/your-company"
              className={`${profileInputClass} pl-9`}
              {...register("linkedinUrl")}
            />
          </div>
        </ProfileField>
      </ProfileSection>

      {/* ── Headquarters & Address ── */}
      <ProfileSection
        title="Office location"
        description="Registered headquarters or primary office location."
        icon={MapPin}
      >
        <ProfileField label="Country *" error={errors.country?.message}>
          <input
            type="text"
            placeholder="e.g. India"
            className={profileInputClass}
            {...register("country")}
          />
        </ProfileField>

        <ProfileField label="State / Province *" error={errors.state?.message}>
          <input
            type="text"
            placeholder="e.g. Karnataka"
            className={profileInputClass}
            {...register("state")}
          />
        </ProfileField>

        <ProfileField label="City *" error={errors.city?.message}>
          <input
            type="text"
            placeholder="e.g. Bengaluru"
            className={profileInputClass}
            {...register("city")}
          />
        </ProfileField>

        <ProfileField
          label="Complete office address *"
          error={errors.address?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={2}
            placeholder="Building, street, tech park, and postal code..."
            className={`${profileInputClass} resize-none`}
            {...register("address")}
          />
        </ProfileField>
      </ProfileSection>

      {/* ── Legal & Registration Identifiers ── */}
      <ProfileSection
        title="Legal & compliance details"
        description="Optional business registration identifiers for verification."
        icon={ShieldCheck}
      >
        <ProfileField label="GSTIN (optional)" error={errors.gstin?.message}>
          <input
            type="text"
            placeholder="e.g. 29ABCDE1234F1Z5"
            maxLength={15}
            className={`${profileInputClass} uppercase`}
            {...register("gstin")}
          />
        </ProfileField>

        <ProfileField
          label="CIN / Registration Number (optional)"
          error={errors.registrationNumber?.message}
        >
          <input
            type="text"
            placeholder="e.g. U72200KA2018PTC123456"
            className={`${profileInputClass} uppercase`}
            {...register("registrationNumber")}
          />
        </ProfileField>
      </ProfileSection>

      {/* ── Form Actions ── */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <Button type="submit" disabled={busy} className="gap-2">
          <Save size={16} />
          {isSaving ? "Saving..." : submitLabel}
        </Button>

        {onSubmitAndRequestApproval && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={handleSubmit(handleSaveAndSubmit)}
            className="gap-2 border-brand/30 text-brand hover:bg-blue-50"
          >
            <Send size={16} />
            {isSubmittingApproval
              ? "Submitting..."
              : "Save & Submit for Approval"}
          </Button>
        )}
      </div>
    </form>
  );
}
