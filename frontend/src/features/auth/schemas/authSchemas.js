import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Max 100 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Max 72 characters")
    .regex(/[a-z]/, "Needs at least one lowercase letter")
    .regex(/[A-Z]/, "Needs at least one uppercase letter")
    .regex(/[0-9]/, "Needs at least one number"),
  role: z.enum(["candidate", "recruiter"]),
});
