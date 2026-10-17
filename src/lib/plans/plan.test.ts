import { describe, expect, it } from "vitest";
import { limitsFor, PLAN_LIMITS } from "@/lib/plans/limits";
import { FREE_PLAN, resolvePlan, subscriptionIsLive, type SubscriptionRow } from "@/lib/plans/plan";

const NOW = new Date("2026-10-16T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function subscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: "sub-own",
    planType: "INDIVIDUAL",
    billingInterval: "MONTHLY",
    status: "ACTIVE",
    paidAt: new Date(NOW.getTime() - 10 * DAY),
    currentPeriodStart: new Date(NOW.getTime() - 10 * DAY),
    currentPeriodEnd: new Date(NOW.getTime() + 20 * DAY),
    canceledAt: null,
    ...overrides,
  };
}

const expired = { currentPeriodEnd: new Date(NOW.getTime() - DAY) };

function seat(overrides: Partial<SubscriptionRow> = {}) {
  return {
    subscription: subscription({ id: "sub-business", planType: "BUSINESS", ...overrides }),
    ownerId: "owner-1",
    ownerName: "Jordan",
  };
}

describe("subscriptionIsLive", () => {
  it("is live while the period has not ended", () => {
    expect(subscriptionIsLive(subscription(), NOW)).toBe(true);
  });

  it("ends exactly at currentPeriodEnd", () => {
    expect(subscriptionIsLive(subscription({ currentPeriodEnd: NOW }), NOW)).toBe(false);
  });

  it("keeps CANCELED and PAST_DUE live until the period ends", () => {
    expect(subscriptionIsLive(subscription({ status: "CANCELED" }), NOW)).toBe(true);
    expect(subscriptionIsLive(subscription({ status: "PAST_DUE" }), NOW)).toBe(true);
    expect(subscriptionIsLive(subscription({ status: "CANCELED", ...expired }), NOW)).toBe(false);
  });

  it("never treats INCOMPLETE as live", () => {
    expect(subscriptionIsLive(subscription({ status: "INCOMPLETE" }), NOW)).toBe(false);
  });
});

describe("resolvePlan", () => {
  it("is Free with no subscription or seat", () => {
    expect(resolvePlan({ own: null, seat: null }, NOW)).toEqual(FREE_PLAN);
  });

  it("gives the owner of a live subscription Pro", () => {
    const plan = resolvePlan({ own: subscription(), seat: null }, NOW);
    expect(plan).toMatchObject({ tier: "PRO", source: "OWN", isPlanOwner: true, subscriptionId: "sub-own", ownerId: null });
  });

  it("shows an expired own subscription as EXPIRED, still the owner's view", () => {
    const plan = resolvePlan({ own: subscription(expired), seat: null }, NOW);
    expect(plan).toMatchObject({ tier: "EXPIRED", source: "OWN", isPlanOwner: true });
  });

  it("shows an INCOMPLETE own subscription as EXPIRED, not Pro", () => {
    expect(resolvePlan({ own: subscription({ status: "INCOMPLETE" }), seat: null }, NOW).tier).toBe("EXPIRED");
  });

  it("prefers a live seat over a live own subscription", () => {
    const plan = resolvePlan({ own: subscription(), seat: seat() }, NOW);
    expect(plan).toMatchObject({
      tier: "PRO",
      source: "SEAT",
      planType: "BUSINESS",
      isPlanOwner: false,
      subscriptionId: "sub-business",
      ownerId: "owner-1",
      ownerName: "Jordan",
    });
  });

  it("falls back to a live own subscription when the seat expired", () => {
    const plan = resolvePlan({ own: subscription(), seat: seat(expired) }, NOW);
    expect(plan).toMatchObject({ tier: "PRO", source: "OWN", ownerId: null });
  });

  it("shows the expired seat when nothing is live", () => {
    const plan = resolvePlan({ own: subscription(expired), seat: seat(expired) }, NOW);
    expect(plan).toMatchObject({ tier: "EXPIRED", source: "SEAT", isPlanOwner: false, ownerId: "owner-1" });
  });
});

describe("limitsFor", () => {
  it("gives Pro its limits", () => {
    expect(limitsFor("PRO")).toEqual({ activeSurveys: 5, invites: 3 });
  });

  it("gives Free and expired plans the Free limits", () => {
    expect(limitsFor("FREE")).toEqual(PLAN_LIMITS.FREE);
    expect(limitsFor("EXPIRED")).toEqual({ activeSurveys: 1, invites: 0 });
  });
});
