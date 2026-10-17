import { describe, expect, it, vi } from "vitest";
import type { PlanType } from "@/lib/plans/plan";
import { assertCanRenew, RenewalError } from "@/lib/plans/renewal";

const NOW = new Date("2026-10-16T12:00:00Z");

interface FakeData {
  // Seats the user holds in someone else's Business plan
  heldSeats?: number;
  own?: { id: string; planType: PlanType } | null;
  // Seats and pending plan invites on the user's own subscription
  usedSeats?: number;
  pendingInvites?: number;
}

function fakeDb({ heldSeats = 0, own = null, usedSeats = 0, pendingInvites = 0 }: FakeData) {
  return {
    subscriptionSeat: {
      count: vi.fn(async ({ where }: { where: { userId?: string; subscriptionId?: string } }) =>
        where.userId ? heldSeats : usedSeats,
      ),
    },
    subscription: { findUnique: vi.fn(async () => own) },
    invitation: { count: vi.fn(async () => pendingInvites) },
  };
}

async function renewalCode(db: ReturnType<typeof fakeDb>, planType: PlanType) {
  try {
    await assertCanRenew(db, "user-1", planType, NOW);
    return null;
  } catch (error) {
    if (error instanceof RenewalError) return error.code;
    throw error;
  }
}

describe("assertCanRenew", () => {
  it("blocks a Business member from buying any plan", async () => {
    expect(await renewalCode(fakeDb({ heldSeats: 1 }), "INDIVIDUAL")).toBe("IN_BUSINESS_PLAN");
    expect(await renewalCode(fakeDb({ heldSeats: 1 }), "BUSINESS")).toBe("IN_BUSINESS_PLAN");
  });

  it("lets anyone without a seat buy or renew Business", async () => {
    const db = fakeDb({ own: { id: "sub-1", planType: "BUSINESS" }, usedSeats: 3 });
    expect(await renewalCode(db, "BUSINESS")).toBeNull();
    expect(db.subscription.findUnique).not.toHaveBeenCalled();
  });

  it("lets a user with no plan or an Individual plan take Individual", async () => {
    expect(await renewalCode(fakeDb({}), "INDIVIDUAL")).toBeNull();
    expect(await renewalCode(fakeDb({ own: { id: "sub-1", planType: "INDIVIDUAL" } }), "INDIVIDUAL")).toBeNull();
  });

  it("lets a Business owner with no members or invites switch to Individual", async () => {
    expect(await renewalCode(fakeDb({ own: { id: "sub-1", planType: "BUSINESS" } }), "INDIVIDUAL")).toBeNull();
  });

  it("blocks the switch to Individual while seats are in use", async () => {
    const db = fakeDb({ own: { id: "sub-1", planType: "BUSINESS" }, usedSeats: 1 });
    expect(await renewalCode(db, "INDIVIDUAL")).toBe("SEATS_IN_USE");
  });

  it("counts pending, unexpired plan invites as seats in use", async () => {
    const db = fakeDb({ own: { id: "sub-1", planType: "BUSINESS" }, pendingInvites: 1 });
    expect(await renewalCode(db, "INDIVIDUAL")).toBe("SEATS_IN_USE");
    expect(db.invitation.count).toHaveBeenCalledWith({
      where: { subscriptionId: "sub-1", status: "PENDING", expiresAt: { gt: NOW } },
    });
  });
});
