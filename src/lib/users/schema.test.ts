import { describe, expect, it } from "vitest";
import { userFormSchema, type UserFormInput } from "@/lib/users/schema";

// The phone as the form sends it ("+52 55 1234 5678") and as the server stores it (E.164). The
// per-country rules are in phone.test.ts; here, how the schema uses them

function input(phone: string): UserFormInput {
  return { name: "Jordan Davis", email: "Jordan@Acme.co", phone, password: "", confirmPassword: "", currentPassword: "" };
}

function phoneIssue(phone: string): string | undefined {
  const result = userFormSchema("edit").safeParse(input(phone));
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === "phone")?.message;
}

describe("userFormSchema phone", () => {
  it("stores formatted Mexican and US numbers as E.164", () => {
    expect(userFormSchema("edit").parse(input("+52 55 1234 5678")).phone).toBe("+525512345678");
    expect(userFormSchema("edit").parse(input("+1 (415) 555-0134")).phone).toBe("+14155550134");
    expect(userFormSchema("edit").parse(input(" +44 20 7946 0958 ")).phone).toBe("+442079460958");
  });

  it("stores an empty phone as null (it is optional)", () => {
    expect(userFormSchema("edit").parse(input("")).phone).toBeNull();
    expect(userFormSchema("edit").parse(input("   ")).phone).toBeNull();
  });

  it("reports the country's message key", () => {
    expect(phoneIssue("+52 55 1234")).toBe("invalidPhoneMx");
    expect(phoneIssue("+1 (015) 555-0134")).toBe("invalidPhoneUs");
    expect(phoneIssue("+44 12")).toBe("invalidPhone");
  });

  it("still normalizes the other fields", () => {
    expect(userFormSchema("edit").parse(input("")).email).toBe("jordan@acme.co");
  });
});
