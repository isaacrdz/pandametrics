import * as z from "zod";
import { parsePhone } from "@/lib/phone";

// Shared by react-hook-form (client) and the Server Actions.
// Error messages are keys under "validation" in src/messages, translated on the client.

export const USER_LIMITS = {
  name: 80,
  email: 254,
  passwordMin: 8,
  // A sane upper bound (scrypt has none); also keeps bcrypt's 72-byte limit if hashing ever moves
  passwordMax: 72,
} as const;

// edit: an empty pair keeps the current password. profile: like edit, and changing the password
// also asks for the current one.
export type UserFormSchemaMode = "edit" | "profile";

// The field holds "+52 55 1234 5678" (or the US / another country's form); stored as E.164.
// Empty is allowed: the phone is optional
const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const parsed = parsePhone(value);
    if (parsed.ok) return parsed.phone;
    ctx.addIssue({ code: "custom", message: parsed.error });
    return z.NEVER;
  });

export function isValidPassword(value: string): boolean {
  return (
    value.length >= USER_LIMITS.passwordMin &&
    value.length <= USER_LIMITS.passwordMax &&
    /\p{L}/u.test(value) &&
    /\d/.test(value)
  );
}

export const baseSchema = z.object({
  name: z.string().trim().min(1, { error: "required" }).max(USER_LIMITS.name, { error: "tooLong" }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "required" })
    .max(USER_LIMITS.email, { error: "tooLong" })
    .pipe(z.email({ error: "invalidEmail" })),
  phone: phoneSchema,
  password: z.string(),
  confirmPassword: z.string(),
  // Profile only: checked against the stored hash on the server, never stored
  currentPassword: z.string(),
});

export function userFormSchema(mode: UserFormSchemaMode) {
  return baseSchema.superRefine((values, ctx) => {
    const wantsPassword =
      values.password !== "" ||
      values.confirmPassword !== "" ||
      (mode === "profile" && values.currentPassword !== "");
    if (!wantsPassword) return;

    if (mode === "profile" && values.currentPassword === "") {
      ctx.addIssue({ code: "custom", path: ["currentPassword"], message: "required" });
    }

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
}

// What the form edits: plain strings, so every input is controlled
export type UserFormInput = z.input<typeof baseSchema>;

// What the server receives after parsing: normalized email and phone (null when empty)
export type UserFormValues = z.output<typeof baseSchema>;

// Never carries a password: the form always starts with empty password fields
export function toUserFormValues(user: { name: string | null; email: string | null; phone: string | null }): UserFormInput {
  return {
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    password: "",
    confirmPassword: "",
    currentPassword: "",
  };
}
