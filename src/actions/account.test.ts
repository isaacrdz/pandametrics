import { beforeEach, describe, expect, it, vi } from "vitest";

// The deleteAccount action: the user comes from the session, errors come back as codes without
// signing out, and a deletion expires every cache it touched before ending the session

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  signOut: vi.fn(),
  deleteCookie: vi.fn(),
  service: vi.fn(),
}));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: mocks.deleteCookie }) }));
vi.mock("@/auth", () => ({ signOut: mocks.signOut }));
// The tag helpers live next to queries; nothing here reaches the database
vi.mock("@/server/prisma", () => ({ prisma: {} }));
vi.mock("@/server/app-context", () => ({ getAccountContext: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/users/delete-account", async () => {
  class DeleteAccountError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  }
  return { deleteAccount: mocks.service, DeleteAccountError };
});

const { deleteAccount } = await import("@/actions/account");
const { DeleteAccountError } = await import("@/lib/users/delete-account");

describe("deleteAccount action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("deletes the signed-in user, expires every touched cache and signs out with a notice", async () => {
    mocks.service.mockResolvedValue({
      organizationIds: ["org-own", "org-a"],
      subscriptionIds: ["sub-1"],
      affectedUserIds: ["user-2"],
    });
    await deleteAccount();

    expect(mocks.service).toHaveBeenCalledWith("user-1");
    const tags = mocks.updateTag.mock.calls.map(([tag]) => tag);
    expect(tags).toEqual(
      expect.arrayContaining([
        "user:user-1",
        "org:org-own:users",
        "org:org-own:invitations",
        "org:org-own:surveys",
        "org:org-a:users",
        "subscription:sub-1",
        "user:user-2",
      ]),
    );
    expect(mocks.deleteCookie).toHaveBeenCalledWith("panda-org");
    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/sign-in?deleted=1" });
  });

  it("returns the service's code and stays signed in", async () => {
    mocks.service.mockRejectedValue(new DeleteAccountError("ORGANIZATION_HAS_MEMBERS"));
    await expect(deleteAccount()).resolves.toEqual({ success: false, error: { code: "ORGANIZATION_HAS_MEMBERS" } });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.deleteCookie).not.toHaveBeenCalled();
  });

  it("hides unexpected errors behind UNKNOWN", async () => {
    mocks.service.mockRejectedValue(new Error("connection lost"));
    await expect(deleteAccount()).resolves.toEqual({ success: false, error: { code: "UNKNOWN" } });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
