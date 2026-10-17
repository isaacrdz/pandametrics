// The effective plan of a user, from their own subscription and their Business seat. Pure and
// shared: the server computes it on every request with the current time, never caches the result,
// so a plan whose period ends turns EXPIRED at that moment (docs/subscriptions.md, section 2.2)

export type PlanType = "INDIVIDUAL" | "BUSINESS";
export type BillingInterval = "MONTHLY" | "YEARLY";
export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "PAST_DUE" | "INCOMPLETE";

// FREE: no subscription or seat. PRO: a live one. EXPIRED: there is one, but nothing is live
export type PlanTier = "FREE" | "PRO" | "EXPIRED";

export interface SubscriptionRow {
  id: string;
  planType: PlanType;
  billingInterval: BillingInterval;
  status: SubscriptionStatus;
  paidAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
}

export interface PlanRows {
  // The user's own subscription (they pay)
  own: SubscriptionRow | null;
  // A seat in someone else's Business plan
  seat: { subscription: SubscriptionRow; ownerName: string | null } | null;
}

export interface PlanState {
  tier: PlanTier;
  planType: PlanType | null;
  billingInterval: BillingInterval | null;
  status: SubscriptionStatus | null;
  // Where the plan comes from: the user's own subscription or a Business seat
  source: "OWN" | "SEAT" | null;
  // Pays for it: may renew (members never do)
  isPlanOwner: boolean;
  paidAt: Date | null;
  currentPeriodEnd: Date | null;
  subscriptionId: string | null;
  // Seats: the Business plan owner's name, for "You are on {owner}'s Business plan"
  ownerName: string | null;
}

export const FREE_PLAN: PlanState = {
  tier: "FREE",
  planType: null,
  billingInterval: null,
  status: null,
  source: null,
  isPlanOwner: false,
  paidAt: null,
  currentPeriodEnd: null,
  subscriptionId: null,
  ownerName: null,
};

// Paid and within its period. CANCELED and PAST_DUE stay Pro until currentPeriodEnd; INCOMPLETE
// (the first payment never went through) never is
export function subscriptionIsLive(subscription: Pick<SubscriptionRow, "status" | "currentPeriodEnd">, now: Date): boolean {
  return subscription.status !== "INCOMPLETE" && subscription.currentPeriodEnd.getTime() > now.getTime();
}

function fromSubscription(subscription: SubscriptionRow, source: "OWN" | "SEAT", now: Date, ownerName: string | null): PlanState {
  return {
    tier: subscriptionIsLive(subscription, now) ? "PRO" : "EXPIRED",
    planType: subscription.planType,
    billingInterval: subscription.billingInterval,
    status: subscription.status,
    source,
    isPlanOwner: source === "OWN",
    paidAt: subscription.paidAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    subscriptionId: subscription.id,
    ownerName,
  };
}

// A live seat, then a live own subscription. With nothing live, a seat still wins: its member sees
// the Business plan expired (they cannot renew it), and an own subscription shows the owner's view
export function resolvePlan({ own, seat }: PlanRows, now: Date): PlanState {
  if (seat && subscriptionIsLive(seat.subscription, now)) return fromSubscription(seat.subscription, "SEAT", now, seat.ownerName);
  if (own && subscriptionIsLive(own, now)) return fromSubscription(own, "OWN", now, null);
  if (seat) return fromSubscription(seat.subscription, "SEAT", now, seat.ownerName);
  if (own) return fromSubscription(own, "OWN", now, null);
  return FREE_PLAN;
}
