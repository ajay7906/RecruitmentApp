import { z } from "zod";

export const employmentTypeOptions = [
  "Full Time",
  "Part Time",
  "Contract",
  "Internship",
  "Temporary",
  "Freelance",
];

export const workModeOptions = ["Onsite", "Remote", "Hybrid"];

export const salaryPeriodOptions = ["Yearly", "Monthly", "Hourly"];

export const salaryCurrencyOptions = ["INR", "USD", "EUR", "GBP", "CAD", "AUD", "SGD"];

export const educationLevelOptions = [
  "High School / Diploma",
  "Associate Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate (Ph.D.)",
  "Any / Not Required",
];

export const questionTypeOptions = [
  { value: "SHORT_TEXT", label: "Short Text" },
  { value: "LONG_TEXT", label: "Long Text" },
  { value: "SINGLE_CHOICE", label: "Single Choice" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "YES_NO", label: "Yes / No" },
];

export const jobStatusOptions = [
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "CLOSED",
  "REJECTED",
  "EXPIRED",
  "ARCHIVED",
  "UNDER_REVIEW",
];

export const jobModerationStatusOptions = [
  "NOT_REVIEWED",
  "FLAGGED",
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "CLEARED",
];

const applicationQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(2, "Question text is required").max(500),
  type: z.enum([
    "SHORT_TEXT",
    "LONG_TEXT",
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "YES_NO",
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim()).optional().default([]),
});

export const jobFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Job title must be at least 3 characters")
      .max(150, "Job title must be 150 characters or fewer"),
    companyId: z.string().uuid("Please select a company"),
    department: z.string().trim().max(100, "Max 100 characters"),
    category: z.string().trim().max(100, "Max 100 characters"),
    summary: z.string().trim().max(1000, "Summary must be 1000 characters or fewer"),
    description: z
      .string()
      .trim()
      .min(20, "Job description must be at least 20 characters")
      .max(15000, "Description is too long"),
    numberOfOpenings: z
      .string()
      .trim()
      .refine((v) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= 5000;
      }, "Openings must be a whole number between 1 and 5000"),
    employmentType: z
      .enum(["", ...employmentTypeOptions])
      .refine((v) => v !== "", "Please select an employment type"),
    workMode: z
      .enum(["", ...workModeOptions])
      .refine((v) => v !== "", "Please select a work mode"),

    experienceLevel: z.string().trim().max(100, "Max 100 characters"),
    minExperience: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 60),
        "Min experience must be between 0 and 60 years"
      ),
    maxExperience: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 60),
        "Max experience must be between 0 and 60 years"
      ),

    minSalary: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0),
        "Enter a valid minimum salary"
      ),
    maxSalary: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0),
        "Enter a valid maximum salary"
      ),
    salaryCurrency: z.string().trim().min(1).max(10),
    salaryPeriod: z.enum(salaryPeriodOptions),
    discloseSalary: z.boolean(),

    country: z.string().trim().max(100),
    state: z.string().trim().max(100),
    city: z.string().trim().max(100),
    officeLocation: z.string().trim().max(300),
    pincode: z.string().trim().max(20),

    requiredSkills: z
      .array(z.string().trim().min(1))
      .min(1, "Add at least one required skill"),
    preferredSkills: z.array(z.string().trim().min(1)),
    educationalQualification: z.string().trim().max(300),
    minEducationLevel: z.string().trim().max(150),
    preferredQualifications: z.string().trim().max(1000),
    requiredCertifications: z.array(z.string().trim().min(1)),
    experienceDescription: z.string().trim().max(2000),
    additionalRequirements: z.string().trim().max(2000),

    responsibilities: z.array(z.string().trim().min(1)),
    benefits: z.array(z.string().trim().min(1)),
    perks: z.array(z.string().trim().min(1)),
    additionalInfo: z.string().trim().max(3000),
    applicationInstructions: z.string().trim().max(2000),
    contactEmail: z
      .string()
      .trim()
      .refine(
        (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        "Enter a valid contact email"
      ),

    applicationDeadline: z.string().trim(),
    allowAfterDeadline: z.boolean(),
    requireResume: z.boolean(),
    requireCoverLetter: z.boolean(),
    maxApplications: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1),
        "Max applications must be at least 1"
      ),
    applicationQuestions: z.array(applicationQuestionSchema),
    requireAdminApproval: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.minExperience !== "" &&
      data.maxExperience !== "" &&
      Number(data.maxExperience) < Number(data.minExperience)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Max experience must be greater than or equal to min experience",
        path: ["maxExperience"],
      });
    }

    if (
      data.minSalary !== "" &&
      data.maxSalary !== "" &&
      Number(data.maxSalary) < Number(data.minSalary)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Max salary must be greater than or equal to min salary",
        path: ["maxSalary"],
      });
    }

    if (data.workMode !== "Remote") {
      if (!data.country) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Country is required for Onsite and Hybrid jobs",
          path: ["country"],
        });
      }
      if (!data.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "City is required for Onsite and Hybrid jobs",
          path: ["city"],
        });
      }
    }
  });

export function toJobFormDefaults(job = {}, defaultCompanyId = "") {
  return {
    title: job.title ?? job.jobTitle ?? "",
    companyId: job.companyId ?? defaultCompanyId ?? "",
    department: job.department ?? "",
    category: job.category ?? job.jobCategory ?? "",
    summary: job.summary ?? job.jobSummary ?? "",
    description: job.description ?? job.jobDescription ?? "",
    numberOfOpenings:
      job.numberOfOpenings != null ? String(job.numberOfOpenings) : "1",
    employmentType: job.employmentType ?? "Full Time",
    workMode: job.workMode ?? "Onsite",

    experienceLevel: job.experienceLevel ?? "",
    minExperience:
      job.minExperience != null && job.minExperience !== ""
        ? String(job.minExperience)
        : "0",
    maxExperience:
      job.maxExperience != null && job.maxExperience !== ""
        ? String(job.maxExperience)
        : "",

    minSalary:
      job.minSalary != null && job.minSalary !== ""
        ? String(job.minSalary)
        : "",
    maxSalary:
      job.maxSalary != null && job.maxSalary !== ""
        ? String(job.maxSalary)
        : "",
    salaryCurrency: job.salaryCurrency ?? "INR",
    salaryPeriod: job.salaryPeriod ?? "Yearly",
    discloseSalary: job.discloseSalary ?? true,

    country: job.country ?? "",
    state: job.state ?? "",
    city: job.city ?? "",
    officeLocation: job.officeLocation ?? "",
    pincode: job.pincode ?? "",

    requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills : [],
    preferredSkills: Array.isArray(job.preferredSkills) ? job.preferredSkills : [],
    educationalQualification: job.educationalQualification ?? "",
    minEducationLevel: job.minEducationLevel ?? "",
    preferredQualifications: job.preferredQualifications ?? "",
    requiredCertifications: Array.isArray(job.requiredCertifications)
      ? job.requiredCertifications
      : [],
    experienceDescription: job.experienceDescription ?? "",
    additionalRequirements: job.additionalRequirements ?? "",

    responsibilities: Array.isArray(job.responsibilities)
      ? job.responsibilities
      : [],
    benefits: Array.isArray(job.benefits) ? job.benefits : [],
    perks: Array.isArray(job.perks) ? job.perks : [],
    additionalInfo: job.additionalInfo ?? "",
    applicationInstructions: job.applicationInstructions ?? "",
    contactEmail: job.contactEmail ?? "",

    applicationDeadline: job.applicationDeadline
      ? new Date(job.applicationDeadline).toISOString().slice(0, 10)
      : "",
    allowAfterDeadline: Boolean(job.allowAfterDeadline),
    requireResume: job.requireResume ?? true,
    requireCoverLetter: Boolean(job.requireCoverLetter),
    maxApplications:
      job.maxApplications != null && job.maxApplications !== ""
        ? String(job.maxApplications)
        : "",
    applicationQuestions: Array.isArray(job.applicationQuestions)
      ? job.applicationQuestions
      : [],
    requireAdminApproval: Boolean(job.requireAdminApproval),
  };
}

export function cleanJobPayload(values, includeCompanyId = true) {
  const payload = {
    title: values.title.trim(),
    department: values.department || null,
    category: values.category || null,
    summary: values.summary || null,
    description: values.description.trim(),
    numberOfOpenings: Number(values.numberOfOpenings) || 1,
    employmentType: values.employmentType,
    workMode: values.workMode,

    experienceLevel: values.experienceLevel || null,
    minExperience:
      values.minExperience !== "" ? Number(values.minExperience) : null,
    maxExperience:
      values.maxExperience !== "" ? Number(values.maxExperience) : null,

    minSalary: values.minSalary !== "" ? Number(values.minSalary) : null,
    maxSalary: values.maxSalary !== "" ? Number(values.maxSalary) : null,
    salaryCurrency: values.salaryCurrency || "INR",
    salaryPeriod: values.salaryPeriod || "Yearly",
    discloseSalary: Boolean(values.discloseSalary),

    country: values.country || null,
    state: values.state || null,
    city: values.city || null,
    officeLocation: values.officeLocation || null,
    pincode: values.pincode || null,

    requiredSkills: (values.requiredSkills || []).filter(Boolean),
    preferredSkills: (values.preferredSkills || []).filter(Boolean),
    educationalQualification: values.educationalQualification || null,
    minEducationLevel: values.minEducationLevel || null,
    preferredQualifications: values.preferredQualifications || null,
    requiredCertifications: (values.requiredCertifications || []).filter(Boolean),
    experienceDescription: values.experienceDescription || null,
    additionalRequirements: values.additionalRequirements || null,

    responsibilities: (values.responsibilities || []).filter(Boolean),
    benefits: (values.benefits || []).filter(Boolean),
    perks: (values.perks || []).filter(Boolean),
    additionalInfo: values.additionalInfo || null,
    applicationInstructions: values.applicationInstructions || null,
    contactEmail: values.contactEmail || null,

    applicationDeadline: values.applicationDeadline
      ? new Date(`${values.applicationDeadline}T23:59:59.999Z`).toISOString()
      : null,
    allowAfterDeadline: Boolean(values.allowAfterDeadline),
    requireResume: Boolean(values.requireResume),
    requireCoverLetter: Boolean(values.requireCoverLetter),
    maxApplications:
      values.maxApplications !== "" ? Number(values.maxApplications) : null,
    applicationQuestions: values.applicationQuestions || [],
    requireAdminApproval: Boolean(values.requireAdminApproval),
  };

  if (includeCompanyId) {
    payload.companyId = values.companyId;
  }

  return payload;
}

export function formatSalaryRange(job) {
  if (!job || !job.discloseSalary) return "Salary not disclosed";
  const min = job.minSalary;
  const max = job.maxSalary;
  if (min == null && max == null) return "Competitive salary";

  const currency = job.salaryCurrency || "INR";
  const fmt = (val) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(val);
    } catch {
      return `${currency} ${Number(val).toLocaleString()}`;
    }
  };

  const period = job.salaryPeriod ? ` / ${job.salaryPeriod.toLowerCase()}` : "";
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}${period}`;
  if (min != null) return `From ${fmt(min)}${period}`;
  return `Up to ${fmt(max)}${period}`;
}

export function formatExperienceRange(job) {
  if (!job) return "Experience not specified";
  const min = job.minExperience;
  const max = job.maxExperience;
  if (min != null && max != null) {
    if (min === 0 && max === 0) return "Fresher (0 yrs)";
    return `${min} – ${max} yrs`;
  }
  if (min != null) return `${min}+ yrs`;
  if (max != null) return `Up to ${max} yrs`;
  return job.experienceLevel || "Any experience";
}
