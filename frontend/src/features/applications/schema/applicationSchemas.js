import { z } from "zod";

export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
];

export const APPLICATION_STATUS_META = {
  SUBMITTED: {
    label: "Submitted",
    description: "Application successfully submitted and awaiting initial review.",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    description: "The hiring team is currently reviewing your application.",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    description: "Selected to advance to the next stage of evaluation.",
  },
  INTERVIEW: {
    label: "Interview",
    description: "Being considered or scheduled for an interview stage.",
  },
  OFFERED: {
    label: "Offered",
    description: "The company has extended a job offer.",
  },
  HIRED: {
    label: "Hired",
    description: "Selected and hired for the position.",
  },
  REJECTED: {
    label: "Rejected",
    description: "The hiring team decided not to proceed with this application.",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    description: "Application was withdrawn by the candidate.",
  },
};

export const ALLOWED_RECRUITER_TRANSITIONS = {
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "INTERVIEW", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "OFFERED", "REJECTED"],
  INTERVIEW: ["OFFERED", "HIRED", "REJECTED"],
  OFFERED: ["HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export const CANDIDATE_WITHDRAWABLE_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
];

export const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function formatFileSize(bytes) {
  if (!bytes || Number.isNaN(Number(bytes))) return "";
  const kb = Number(bytes) / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export const withdrawApplicationSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(1000, "Reason must be 1000 characters or fewer")
    .optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum([
    "UNDER_REVIEW",
    "SHORTLISTED",
    "INTERVIEW",
    "OFFERED",
    "HIRED",
    "REJECTED",
  ]),
  reason: z
    .string()
    .trim()
    .max(1500, "Reason must be 1500 characters or fewer")
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Internal notes must be 2000 characters or fewer")
    .optional(),
});
