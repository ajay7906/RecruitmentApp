
import { z } from "zod";

const optionalText = (max, label) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`);

const optionalUrl = z.string().trim().refine(
  (value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  },
  "Enter a valid HTTP or HTTPS URL"
).refine((value) => value.length <= 300, "URL is too long");

export const profileSchema = z.object({
  phone: z.string().trim().refine(
    (value) => !value || /^\+?[0-9\s-]{7,15}$/.test(value),
    "Enter a valid phone number"
  ),
  dateOfBirth: z.string().refine(
    (value) => {
      if (!value) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00`);
      return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        value <= new Date().toISOString().slice(0, 10);
    },
    "Enter a valid date that is not in the future"
  ),
  gender: z.enum([
    "",
    "male",
    "female",
    "other",
    "prefer_not_to_say",
  ]),
  headline: optionalText(150, "Headline"),
  bio: optionalText(2000, "Bio"),
  location: optionalText(150, "Location"),
  city: optionalText(100, "City"),
  state: optionalText(100, "State"),
  country: optionalText(100, "Country"),
  yearsOfExperience: z.string().refine(
    (value) =>
      value === "" ||
      (
        Number.isFinite(Number(value)) &&
        Number(value) >= 0 &&
        Number(value) <= 60
      ),
    "Experience must be between 0 and 60 years"
  ),
  currentJobTitle: optionalText(100, "Job title"),
  currentCompany: optionalText(100, "Company"),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
});
