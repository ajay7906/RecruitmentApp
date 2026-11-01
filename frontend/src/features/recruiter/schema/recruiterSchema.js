import { z } from "zod";

const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(""));

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const url = new URL(v);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    },
    "Enter a valid HTTP or HTTPS URL"
  )
  .refine((v) => v.length <= 300, "URL is too long")
  .optional()
  .or(z.literal(""));

// ── Recruiter profile ────────────────────────────────────────────
export const recruiterProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be 100 characters or fewer"),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^\+?[0-9\s-]{7,15}$/.test(v),
      "Enter a valid phone number"
    ),
  designation: optionalText(100, "Designation"),
  linkedinUrl: optionalUrl,
});

// ── Company create / edit ────────────────────────────────────────
export const companySizeOptions = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(150, "Company name must be 150 characters or fewer"),
  website: optionalUrl,
  description: optionalText(2000, "Description"),
  industry: optionalText(100, "Industry"),
  companySize: z
    .enum(["", ...companySizeOptions])
    .optional(),
  location: optionalText(150, "Location"),
});
