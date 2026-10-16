import * as z from "zod";
import { USER_LIMITS, baseSchema, isValidPassword } from "@/lib/users/schema";

// Sign-in and registration input. Shared by the API, Auth.js and (phase 3) the forms, with the same
// field rules as the user form. Error messages are keys under "validation" in src/messages.

export const ORGANIZATION_NAME_MAX = 80;

export const signInSchema = z.object({
  email: baseSchema.shape.email,
  // Only presence and the upper bound: the rules belong to registration, not to checking a password
  password: z.string().min(1, { error: "required" }).max(USER_LIMITS.passwordMax, { error: "tooLong" }),
});

export const registerSchema = z
  .object({
    name: baseSchema.shape.name,
    email: baseSchema.shape.email,
    password: z.string(),
    confirmPassword: z.string(),
    organizationName: z
      .string()
      .trim()
      .min(1, { error: "required" })
      .max(ORGANIZATION_NAME_MAX, { error: "tooLong" }),
  })
  .superRefine((values, ctx) => {
    if (values.password === "") {
      ctx.addIssue({ code: "custom", path: ["password"], message: "required" });
    } else if (!isValidPassword(values.password)) {
      ctx.addIssue({ code: "custom", path: ["password"], message: "passwordRules" });
    }
    if (values.confirmPassword === "") {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "required" });
    } else if (values.password !== values.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "passwordMismatch" });
    }
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterValues = z.output<typeof registerSchema>;
