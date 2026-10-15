import * as z from "zod";

// Shared by react-hook-form (client) and the Server Actions.
// Error messages are keys under "validation" in src/messages, translated on the client.

export const USER_LIMITS = {
  name: 80,
  email: 254,
  phoneMinDigits: 7,
  phoneMaxDigits: 15,
  passwordMin: 8,
  // bcrypt only reads 72 bytes; kept for when hashing moves to Auth.js
  passwordMax: 72,
} as const;

// create: the password is required. edit: an empty pair keeps the current password.
// profile: like edit, and changing the password also asks for the current one.
export type UserFormSchemaMode = "create" | "edit" | "profile";

// Spaces, dashes, dots and parentheses are dropped; a leading "+" is kept
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\+?[\d\s().-]+$/.test(value), { error: "invalidPhone" })
  .refine(
    (value) => {
      if (value === "") return true;
      const digits = value.replace(/\D/g, "").length;
      return digits >= USER_LIMITS.phoneMinDigits && digits <= USER_LIMITS.phoneMaxDigits;
    },
    { error: "invalidPhone" },
  )
  .transform((value) => (value === "" ? null : normalizePhone(value)));

function isValidPassword(value: string): boolean {
  return (
    value.length >= USER_LIMITS.passwordMin &&
    value.length <= USER_LIMITS.passwordMax &&
    /\p{L}/u.test(value) &&
    /\d/.test(value)
  );
}

const baseSchema = z.object({
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
      mode === "create" ||
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

export const EMPTY_USER_VALUES: UserFormInput = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  currentPassword: "",
};

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
