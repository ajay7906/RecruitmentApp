import { z } from "zod";

export const companySizeOptions = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

export const companyTypeOptions = [
  "Startup",
  "Private Limited",
  "Public Limited",
  "LLP",
  "Partnership",
  "Other",
];

export const companyStatusOptions = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
];

const currentYear = new Date().getFullYear();

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const parsed = new URL(v);
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    "Enter a valid HTTP or HTTPS URL"
  )
  .refine((v) => v.length <= 300, "URL must be 300 characters or fewer");

const optionalLogo = z
  .string()
  .trim()
  .refine(
    (v) => {
      if (!v) return true;
      if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(v)) return true;
      try {
        const parsed = new URL(v);
        return ["http:", "https:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    "Provide a valid image upload (PNG, JPG, WEBP, SVG) or HTTPS URL"
  );

export const companyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(150, "Company name must be 150 characters or fewer"),
  logoUrl: optionalLogo,
  website: optionalUrl,
  email: z
    .string()
    .trim()
    .min(1, "Company email is required")
    .email("Enter a valid company email address")
    .max(150, "Email is too long"),
  contactNumber: z
    .string()
    .trim()
    .min(1, "Company contact number is required")
    .refine(
      (v) => /^\+?[0-9\s-]{7,15}$/.test(v),
      "Enter a valid contact number (7-15 digits)"
    ),
  industry: z
    .string()
    .trim()
    .min(2, "Industry is required")
    .max(100, "Industry must be 100 characters or fewer"),
  companySize: z
    .enum(["", ...companySizeOptions])
    .refine((v) => v !== "", "Please select a company size"),
  companyType: z
    .enum(["", ...companyTypeOptions])
    .refine((v) => v !== "", "Please select a company type"),
  foundedYear: z
    .string()
    .trim()
    .refine(
      (v) => {
        if (!v) return true;
        const n = Number(v);
        return Number.isInteger(n) && n >= 1800 && n <= currentYear;
      },
      `Enter a valid year between 1800 and ${currentYear}`
    ),
  country: z
    .string()
    .trim()
    .min(2, "Country is required")
    .max(100, "Country must be 100 characters or fewer"),
  state: z
    .string()
    .trim()
    .min(2, "State is required")
    .max(100, "State must be 100 characters or fewer"),
  city: z
    .string()
    .trim()
    .min(2, "City is required")
    .max(100, "City must be 100 characters or fewer"),
  address: z
    .string()
    .trim()
    .min(5, "Complete office address is required")
    .max(500, "Office address must be 500 characters or fewer"),
  description: z
    .string()
    .trim()
    .min(20, "Company description must be at least 20 characters")
    .max(3000, "Description must be 3000 characters or fewer"),
  linkedinUrl: optionalUrl,
  gstin: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^[0-9A-Za-z]{15}$/.test(v),
      "GSTIN must be a valid 15-character alphanumeric code"
    ),
  registrationNumber: z
    .string()
    .trim()
    .refine(
      (v) => !v || (v.length >= 3 && v.length <= 50),
      "CIN / Registration Number must be between 3 and 50 characters"
    ),
});

export function toCompanyFormDefaults(company = {}) {
  return {
    name: company.name ?? company.companyName ?? "",
    logoUrl: company.logoUrl ?? company.logo ?? "",
    website: company.website ?? "",
    email: company.email ?? "",
    contactNumber: company.contactNumber ?? "",
    industry: company.industry ?? "",
    companySize: company.companySize ?? "",
    companyType: company.companyType ?? "",
    foundedYear:
      company.foundedYear != null && company.foundedYear !== ""
        ? String(company.foundedYear)
        : "",
    country: company.country ?? "",
    state: company.state ?? "",
    city: company.city ?? "",
    address: company.address ?? "",
    description: company.description ?? "",
    linkedinUrl: company.linkedinUrl ?? company.linkedInUrl ?? "",
    gstin: company.gstin ?? "",
    registrationNumber: company.registrationNumber ?? "",
  };
}

export function cleanCompanyPayload(values) {
  return {
    name: values.name.trim(),
    logoUrl: values.logoUrl || null,
    website: values.website || null,
    email: values.email || null,
    contactNumber: values.contactNumber || null,
    industry: values.industry || null,
    companySize: values.companySize || null,
    companyType: values.companyType || null,
    foundedYear: values.foundedYear !== "" ? Number(values.foundedYear) : null,
    country: values.country || null,
    state: values.state || null,
    city: values.city || null,
    address: values.address || null,
    description: values.description || null,
    linkedinUrl: values.linkedinUrl || null,
    gstin: values.gstin ? values.gstin.toUpperCase() : null,
    registrationNumber: values.registrationNumber
      ? values.registrationNumber.toUpperCase()
      : null,
  };
}
