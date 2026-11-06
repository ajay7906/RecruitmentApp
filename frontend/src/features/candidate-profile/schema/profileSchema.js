import { z } from "zod";

export const EDUCATION_LEVELS = [
  "High School",
  "Intermediate",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
  "Other",
];

export const EMPLOYMENT_TYPES = [
  "Full Time",
  "Part Time",
  "Contract",
  "Internship",
  "Freelance",
  "Other",
];

export const WORK_MODES = ["Onsite", "Remote", "Hybrid"];

export const EMPLOYMENT_STATUSES = [
  "Employed",
  "Actively Looking",
  "Serving Notice Period",
  "Freelancing",
  "Fresher",
  "Career Break",
];

export const NOTICE_PERIODS = [
  "Immediate",
  "15 Days",
  "30 Days",
  "60 Days",
  "90 Days",
  "Negotiable",
];

export const SKILL_CATEGORIES = [
  "Technical",
  "Non-Technical",
  "Tools & Platforms",
  "Frameworks & Libraries",
  "Databases",
  "Cloud & DevOps",
  "Domain Knowledge",
];

export const SKILL_PROFICIENCY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

export const LANGUAGE_PROFICIENCY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Fluent",
  "Native",
];

const optionalText = (max, label) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`);

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }, "Enter a valid HTTP or HTTPS URL")
  .refine((value) => value.length <= 400, "URL is too long");

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name is too long")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^\+?[0-9\s-]{7,15}$/.test(value),
      "Enter a valid phone number"
    ),
  dateOfBirth: z.string().refine((value) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);
    const isValidDate =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;
    return isValidDate && date <= maxDate;
  }, "Enter a valid date that is not in the future"),
  gender: z.enum(["", "male", "female", "other", "prefer_not_to_say"]),
  headline: optionalText(180, "Headline"),
  bio: optionalText(2500, "Bio"),
  careerSummary: optionalText(3000, "Career summary"),
  location: optionalText(180, "Location"),
  city: optionalText(100, "City"),
  state: optionalText(100, "State"),
  country: optionalText(100, "Country"),
  pincode: optionalText(20, "Pincode"),
  address: optionalText(400, "Address"),
  yearsOfExperience: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        (Number.isFinite(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= 60),
      "Experience must be between 0 and 60 years"
    ),
  relevantExperience: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        (Number.isFinite(Number(value)) &&
          Number(value) >= 0 &&
          Number(value) <= 60),
      "Relevant experience must be between 0 and 60 years"
    )
    .optional()
    .or(z.literal("")),
  currentJobTitle: optionalText(120, "Job title"),
  currentCompany: optionalText(120, "Company"),
  employmentStatus: optionalText(80, "Employment status").optional().or(z.literal("")),
  expectedSalary: z
    .string()
    .refine(
      (value) =>
        value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
      "Enter a valid expected salary"
    )
    .optional()
    .or(z.literal("")),
  currentSalary: z
    .string()
    .refine(
      (value) =>
        value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
      "Enter a valid current salary"
    )
    .optional()
    .or(z.literal("")),
  salaryCurrency: z.string().optional().default("INR"),
  noticePeriod: optionalText(80, "Notice period").optional().or(z.literal("")),
  preferredEmploymentType: optionalText(60, "Preferred employment type")
    .optional()
    .or(z.literal("")),
  preferredWorkMode: optionalText(60, "Preferred work mode")
    .optional()
    .or(z.literal("")),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
});
