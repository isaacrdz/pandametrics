import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/lib/users/password";
import type { UserFormValues } from "@/lib/users/schema";

// Your own profile: the password changes only for accounts that have one (email / password
// sign-ups), always with the current one. A Google sign-up never gets a password here, even when
// the action is called directly with one

const db = vi.hoisted(() => ({
  passwordHash: null as string | null,
  update: vi.fn(),
}));
vi.mock("next/cache", () => ({ cacheTag: vi.fn() }));
vi.mock("@/server/prisma", () => ({
  prisma: {
    membership: {
      findFirst: vi.fn(async () => ({
        role: "OWNER",
        isActive: true,
        user: { passwordHash: db.passwordHash },
        organization: { ownerId: "user-1" },
      })),
    },
    user: { update: db.update },
  },
}));

const { updateProfile } = await import("@/lib/users/service");

const SCOPE = { organizationId: "org-1", userId: "user-1" };
const CURRENT = "old-pass-1";

function values(password: Partial<Pick<UserFormValues, "password" | "confirmPassword" | "currentPassword">> = {}): UserFormValues {
  return {
    name: "Jordan Davis",
    email: "jordan@acme.co",
    phone: "+525512345678",
    password: "",
    confirmPassword: "",
    currentPassword: "",
    ...password,
  };
}

function written(): Record<string, unknown> {
  return db.update.mock.calls[0][0].data;
}

describe("updateProfile password rules", () => {
  beforeEach(() => {
    db.update.mockReset();
    db.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "user-1", ...data }));
  });

  it("changes the password of an email / password account with the current one", async () => {
    db.passwordHash = hashPassword(CURRENT);
    await updateProfile(SCOPE, values({ password: "new-pass-2", confirmPassword: "new-pass-2", currentPassword: CURRENT }));
    expect(written().passwordHash).toEqual(expect.any(String));
    expect(written().passwordHash).not.toBe(db.passwordHash);
  });

  it("refuses a wrong current password and writes nothing", async () => {
    db.passwordHash = hashPassword(CURRENT);
    await expect(
      updateProfile(SCOPE, values({ password: "new-pass-2", confirmPassword: "new-pass-2", currentPassword: "nope-1" })),
    ).rejects.toMatchObject({ code: "WRONG_PASSWORD" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("never gives a Google sign-up a password, even when one is sent", async () => {
    db.passwordHash = null;
    await updateProfile(SCOPE, values({ password: "new-pass-2", confirmPassword: "new-pass-2" }));
    expect(written()).not.toHaveProperty("passwordHash");
    // The rest of the profile still saves
    expect(written()).toMatchObject({ name: "Jordan Davis", email: "jordan@acme.co", phone: "+525512345678" });
  });

  it("keeps the password when the fields are empty", async () => {
    db.passwordHash = hashPassword(CURRENT);
    await updateProfile(SCOPE, values());
    expect(written()).not.toHaveProperty("passwordHash");
  });
});
