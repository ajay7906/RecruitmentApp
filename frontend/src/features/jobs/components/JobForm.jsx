import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BriefcaseBusiness,
  MapPin,
  Sparkles,
  ListChecks,
  Wallet,
  Settings2,
  Save,
  Send,
  Building2,
} from "lucide-react";

import {
  jobFormSchema,
  employmentTypeOptions,
  workModeOptions,
  educationLevelOptions,
  toJobFormDefaults,
  cleanJobPayload,
} from "../schema/jobSchemas";
import { ProfileSection } from "../../candidate-profile/components/ProfileSection";
import {
  ProfileField,
  profileInputClass,
} from "../../candidate-profile/components/ProfileField";
import { SkillsInput } from "./SkillsInput";
import { ResponsibilitiesInput } from "./ResponsibilitiesInput";
import { BenefitsInput } from "./BenefitsInput";
import { SalaryInput } from "./SalaryInput";
import { LocationInput } from "./LocationInput";
import { ApplicationSettings } from "./ApplicationSettings";
import { Button } from "../../../components/ui/Button";

export function JobForm({
  initialData,
  companies = [],
  defaultCompanyId = "",
  isEditing = false,
  isSaving = false,
  isPublishing = false,
  submitLabel = "Save as Draft",
  onSubmit,
  onSaveAndPublish,
}) {
  const {
    register,
    control,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(jobFormSchema),
    defaultValues: toJobFormDefaults(initialData, defaultCompanyId),
  });

  useEffect(() => {
    reset(toJobFormDefaults(initialData, defaultCompanyId));
  }, [initialData, defaultCompanyId, reset]);

  const selectedWorkMode = watch("workMode");
  const selectedCompanyId = watch("companyId");
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const busy = isSaving || isPublishing;

  function handleSave(values) {
    onSubmit(cleanJobPayload(values, !isEditing));
  }

  function handlePublish(values) {
    onSaveAndPublish?.(cleanJobPayload(values, !isEditing));
  }

  return (
    <form
      id="job-management-form"
      onSubmit={handleSubmit(handleSave)}
      noValidate
      className="space-y-6"
    >
      {/* ── A. Basic Job Information ── */}
      <ProfileSection
        title="Basic job information"
        description="Core role details, company selection, employment type, and experience range."
        icon={BriefcaseBusiness}
      >
        <ProfileField
          label="Job title *"
          error={errors.title?.message}
          className="sm:col-span-2"
        >
          <input
            type="text"
            placeholder="e.g. Senior Full Stack Engineer"
            className={profileInputClass}
            {...register("title")}
          />
        </ProfileField>

        <ProfileField
          label="Company *"
          error={errors.companyId?.message}
          className="sm:col-span-2"
        >
          <div className="relative">
            <Building2
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              disabled={isEditing}
              className={`${profileInputClass} pl-9 appearance-none`}
              {...register("companyId")}
            >
              <option value="">Select associated company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>
          {selectedCompany && selectedCompany.status !== "APPROVED" && (
            <p className="mt-1.5 text-xs text-amber-700">
              Note: &ldquo;{selectedCompany.name}&rdquo; is currently{" "}
              <strong>{selectedCompany.status}</strong>. You can save jobs as
              Draft or submit for approval, but public publishing requires the
              company to be APPROVED.
            </p>
          )}
        </ProfileField>

        <ProfileField label="Department" error={errors.department?.message}>
          <input
            type="text"
            placeholder="e.g. Engineering, Product, Design"
            className={profileInputClass}
            {...register("department")}
          />
        </ProfileField>

        <ProfileField label="Job category" error={errors.category?.message}>
          <input
            type="text"
            placeholder="e.g. Software Development, Data Science"
            className={profileInputClass}
            {...register("category")}
          />
        </ProfileField>

        <ProfileField
          label="Employment type *"
          error={errors.employmentType?.message}
        >
          <select
            className={`${profileInputClass} appearance-none`}
            {...register("employmentType")}
          >
            {employmentTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </ProfileField>

        <ProfileField label="Work mode *" error={errors.workMode?.message}>
          <select
            className={`${profileInputClass} appearance-none`}
            {...register("workMode")}
          >
            {workModeOptions.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </ProfileField>

        <ProfileField
          label="Number of openings *"
          error={errors.numberOfOpenings?.message}
        >
          <input
            type="number"
            min="1"
            max="5000"
            placeholder="e.g. 3"
            className={profileInputClass}
            {...register("numberOfOpenings")}
          />
        </ProfileField>

        <ProfileField
          label="Experience level label"
          error={errors.experienceLevel?.message}
        >
          <input
            type="text"
            placeholder="e.g. Mid-Senior Level (3-6 Years)"
            className={profileInputClass}
            {...register("experienceLevel")}
          />
        </ProfileField>

        <ProfileField
          label="Minimum experience (years)"
          error={errors.minExperience?.message}
        >
          <input
            type="number"
            min="0"
            max="60"
            step="0.5"
            placeholder="0"
            className={profileInputClass}
            {...register("minExperience")}
          />
        </ProfileField>

        <ProfileField
          label="Maximum experience (years)"
          error={errors.maxExperience?.message}
        >
          <input
            type="number"
            min="0"
            max="60"
            step="0.5"
            placeholder="e.g. 6"
            className={profileInputClass}
            {...register("maxExperience")}
          />
        </ProfileField>

        <ProfileField
          label="Job summary"
          error={errors.summary?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={2}
            placeholder="Short 1-2 sentence overview shown on job cards..."
            className={`${profileInputClass} resize-none`}
            {...register("summary")}
          />
        </ProfileField>

        <ProfileField
          label="Complete job description *"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={6}
            placeholder="Provide a comprehensive description of the role, team, and impact..."
            className={`${profileInputClass} resize-none`}
            {...register("description")}
          />
        </ProfileField>
      </ProfileSection>

      {/* ── B. Job Location ── */}
      <ProfileSection
        title="Job location"
        description="Specify where the candidate will be based. Location is flexible for Remote roles."
        icon={MapPin}
      >
        <LocationInput
          register={register}
          errors={errors}
          workMode={selectedWorkMode}
        />
      </ProfileSection>

      {/* ── C. Job Requirements & Dynamic Skills ── */}
      <ProfileSection
        title="Skills & candidate requirements"
        description="Add technical/domain skills, education levels, and certifications."
        icon={Sparkles}
      >
        <ProfileField
          label="Required skills *"
          error={errors.requiredSkills?.message}
          className="sm:col-span-2"
        >
          <Controller
            name="requiredSkills"
            control={control}
            render={({ field }) => (
              <SkillsInput
                value={field.value}
                onChange={field.onChange}
                disabled={busy}
                placeholder="Type skill and press Enter (e.g. React.js, Node.js, PostgreSQL)"
              />
            )}
          />
        </ProfileField>

        <ProfileField
          label="Preferred / Good-to-have skills"
          error={errors.preferredSkills?.message}
          className="sm:col-span-2"
        >
          <Controller
            name="preferredSkills"
            control={control}
            render={({ field }) => (
              <SkillsInput
                value={field.value}
                onChange={field.onChange}
                disabled={busy}
                placeholder="Type preferred skill and press Enter (e.g. Docker, TypeScript, AWS)"
              />
            )}
          />
        </ProfileField>

        <ProfileField
          label="Minimum education level"
          error={errors.minEducationLevel?.message}
        >
          <select
            className={`${profileInputClass} appearance-none`}
            {...register("minEducationLevel")}
          >
            <option value="">Select education level</option>
            {educationLevelOptions.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </ProfileField>

        <ProfileField
          label="Educational qualification"
          error={errors.educationalQualification?.message}
        >
          <input
            type="text"
            placeholder="e.g. B.Tech / B.E. in Computer Science or equivalent"
            className={profileInputClass}
            {...register("educationalQualification")}
          />
        </ProfileField>

        <ProfileField
          label="Required certifications"
          error={errors.requiredCertifications?.message}
          className="sm:col-span-2"
        >
          <Controller
            name="requiredCertifications"
            control={control}
            render={({ field }) => (
              <SkillsInput
                value={field.value}
                onChange={field.onChange}
                disabled={busy}
                placeholder="Add certifications if applicable (e.g. AWS Solutions Architect)"
              />
            )}
          />
        </ProfileField>

        <ProfileField
          label="Experience description"
          error={errors.experienceDescription?.message}
        >
          <textarea
            rows={3}
            placeholder="Describe specific domain or hands-on experience expected..."
            className={`${profileInputClass} resize-none`}
            {...register("experienceDescription")}
          />
        </ProfileField>

        <ProfileField
          label="Preferred qualifications & additional requirements"
          error={errors.additionalRequirements?.message}
        >
          <textarea
            rows={3}
            placeholder="Any additional requirements or nice-to-have qualifications..."
            className={`${profileInputClass} resize-none`}
            {...register("additionalRequirements")}
          />
        </ProfileField>
      </ProfileSection>

      {/* ── D. Job Responsibilities ── */}
      <ProfileSection
        title="Key responsibilities"
        description="Add clear bullet points outlining day-to-day responsibilities."
        icon={ListChecks}
      >
        <ProfileField
          label="Responsibilities list"
          error={errors.responsibilities?.message}
          className="sm:col-span-2"
        >
          <Controller
            name="responsibilities"
            control={control}
            render={({ field }) => (
              <ResponsibilitiesInput
                value={field.value}
                onChange={field.onChange}
                disabled={busy}
              />
            )}
          />
        </ProfileField>
      </ProfileSection>

      {/* ── E. Compensation, Benefits & Additional Information ── */}
      <ProfileSection
        title="Compensation, benefits & instructions"
        description="Configure salary range, benefits, perks, and candidate instructions."
        icon={Wallet}
      >
        <SalaryInput register={register} errors={errors} />

        <Controller
          name="benefits"
          control={control}
          render={({ field: benefitsField }) => (
            <Controller
              name="perks"
              control={control}
              render={({ field: perksField }) => (
                <BenefitsInput
                  benefits={benefitsField.value}
                  onBenefitsChange={benefitsField.onChange}
                  perks={perksField.value}
                  onPerksChange={perksField.onChange}
                  disabled={busy}
                />
              )}
            />
          )}
        />

        <ProfileField
          label="Contact email (optional)"
          error={errors.contactEmail?.message}
        >
          <input
            type="email"
            placeholder="hiring@company.com"
            className={profileInputClass}
            {...register("contactEmail")}
          />
        </ProfileField>

        <ProfileField
          label="Application instructions (optional)"
          error={errors.applicationInstructions?.message}
        >
          <input
            type="text"
            placeholder="e.g. Include links to your GitHub or live portfolio"
            className={profileInputClass}
            {...register("applicationInstructions")}
          />
        </ProfileField>

        <ProfileField
          label="Additional information (optional)"
          error={errors.additionalInfo?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={2}
            placeholder="Any other notes about the interview process or work culture..."
            className={`${profileInputClass} resize-none`}
            {...register("additionalInfo")}
          />
        </ProfileField>
      </ProfileSection>

      {/* ── F. Application Configuration ── */}
      <ProfileSection
        title="Application configuration"
        description="Control application deadlines, required documents, and screening questions."
        icon={Settings2}
      >
        <Controller
          name="applicationQuestions"
          control={control}
          render={({ field }) => (
            <ApplicationSettings
              register={register}
              errors={errors}
              questions={field.value}
              onQuestionsChange={field.onChange}
              disabled={busy}
            />
          )}
        />
      </ProfileSection>

      {/* ── Form Actions ── */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <Button type="submit" disabled={busy} className="gap-2">
          <Save size={16} />
          {isSaving ? "Saving..." : submitLabel}
        </Button>

        {onSaveAndPublish && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={handleSubmit(handlePublish)}
            className="gap-2 border-brand/30 text-brand hover:bg-blue-50"
          >
            <Send size={16} />
            {isPublishing
              ? "Publishing..."
              : selectedCompany?.status === "APPROVED"
              ? "Save & Publish Job"
              : "Save & Submit for Approval"}
          </Button>
        )}
      </div>
    </form>
  );
}
