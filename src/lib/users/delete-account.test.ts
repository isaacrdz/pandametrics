import { describe, expect, it, vi } from "vitest";

// deleteAccount against a fake transaction: the locks and cascades are SQL, here the decisions
// (owners with other people blocked, a solo owner's organization deleted, the account scrubbed)

const db = vi.hoisted(() => ({ tx: null as unknown }));
vi.mock("next/cache", () => ({ cacheTag: vi.fn() }));
vi.mock("@/server/prisma", () => ({
  prisma: { $transaction: vi.fn(async (run: (tx: unknown) => unknown) => run(db.tx)) },
}));

const { deleteAccount, DeleteAccountError } = await import("@/lib/users/delete-account");

const USER = "user-1";

interface FakeData {
  deletedAt?: Date | null;
  owned?: string | null;
  // Other people in the owned organization
  others?: number;
  // Organizations the user belongs to after the owned one is gone
  memberOf?: string[];
  sentTo?: { userId: string; organizationId: string }[];
  subscription?: { id: string; status: string } | null;
  seatIn?: string | null;
}

function fakeTx({ deletedAt = null, owned = null, others = 0, memberOf = [], sentTo = [], subscription = null, seatIn = null }: FakeData) {
  return {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => (strings.join("").includes(`"deletedAt"`) ? [{ deletedAt }] : [])),
    organization: {
      findUnique: vi.fn(async () => (owned ? { id: owned } : null)),
      delete: vi.fn(async () => ({})),
    },
    membership: {
      count: vi.fn(async () => others),
      findMany: vi.fn(async () => memberOf.map((organizationId) => ({ organizationId }))),
      deleteMany: vi.fn(async () => ({ count: memberOf.length })),
    },
    membershipEvent: { create: vi.fn(async () => ({})) },
    invitation: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => ("invitedById" in where ? sentTo : [])),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    surveyResponse: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    answerOption: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    question: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    survey: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    subscription: {
      findUnique: vi.fn(async () => subscription),
      update: vi.fn(async () => ({})),
    },
    subscriptionSeat: {
      findMany: vi.fn(async () => (seatIn ? [{ id: "seat-1", subscriptionId: "sub-owner" }] : [])),
      findUnique: vi.fn(async () => null),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      delete: vi.fn(async () => ({})),
    },
    account: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    session: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    user: { update: vi.fn(async () => ({})) },
  };
}

describe("deleteAccount", () => {
  it("refuses an owner whose organization has other people, touching nothing", async () => {
    const tx = fakeTx({ owned: "org-own", others: 2 });
    db.tx = tx;
    await expect(deleteAccount(USER)).rejects.toMatchObject({ code: "ORGANIZATION_HAS_MEMBERS" });
    await expect(deleteAccount(USER)).rejects.toBeInstanceOf(DeleteAccountError);
    expect(tx.organization.delete).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("refuses an account that is already deleted", async () => {
    db.tx = fakeTx({ deletedAt: new Date() });
    await expect(deleteAccount(USER)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes a solo owner's organization with its surveys and responses", async () => {
    const tx = fakeTx({ owned: "org-own" });
    db.tx = tx;
    const result = await deleteAccount(USER);
    expect(tx.surveyResponse.deleteMany).toHaveBeenCalledWith({ where: { organizationId: "org-own" } });
    expect(tx.survey.deleteMany).toHaveBeenCalledWith({ where: { organizationId: "org-own" } });
    expect(tx.organization.delete).toHaveBeenCalledWith({ where: { id: "org-own" } });
    expect(result.organizationIds).toContain("org-own");
  });

  it("leaves every other organization, ending a Business seat there", async () => {
    const tx = fakeTx({ memberOf: ["org-a", "org-b"], seatIn: "org-a" });
    db.tx = tx;
    const result = await deleteAccount(USER);
    expect(tx.membershipEvent.create).toHaveBeenCalledTimes(2);
    expect(tx.membershipEvent.create).toHaveBeenCalledWith({ data: { organizationId: "org-a", userId: USER, type: "LEFT" } });
    expect(tx.membership.deleteMany).toHaveBeenCalledWith({ where: { userId: USER } });
    expect(result.organizationIds).toEqual(expect.arrayContaining(["org-a", "org-b"]));
    expect(result.subscriptionIds).toContain("sub-owner");
    expect(tx.organization.delete).not.toHaveBeenCalled();
  });

  it("revokes sent invitations and reports the invitees", async () => {
    db.tx = fakeTx({ sentTo: [{ userId: "user-2", organizationId: "org-a" }] });
    const result = await deleteAccount(USER);
    expect(result.affectedUserIds).toEqual(["user-2"]);
    expect(result.organizationIds).toContain("org-a");
  });

  it("cancels a live plan and leaves an expired or canceled one as it is", async () => {
    const live = fakeTx({ subscription: { id: "sub-1", status: "ACTIVE" } });
    db.tx = live;
    await deleteAccount(USER);
    expect(live.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { status: "CANCELED", canceledAt: expect.any(Date) },
    });

    const canceled = fakeTx({ subscription: { id: "sub-1", status: "CANCELED" } });
    db.tx = canceled;
    await deleteAccount(USER);
    expect(canceled.subscription.update).not.toHaveBeenCalled();
  });

  it("scrubs the account, frees the email and drops the Google link", async () => {
    const tx = fakeTx({});
    db.tx = tx;
    await deleteAccount(USER);
    expect(tx.account.deleteMany).toHaveBeenCalledWith({ where: { userId: USER } });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: USER },
      data: {
        name: null,
        email: null,
        emailVerified: null,
        image: null,
        phone: null,
        passwordHash: null,
        isActive: false,
        deletedAt: expect.any(Date),
      },
    });
  });
});
