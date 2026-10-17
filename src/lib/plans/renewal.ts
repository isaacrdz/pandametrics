import type { PlanType } from "@/lib/plans/plan";

// Who may renew or buy which plan (docs/subscriptions.md, section 8.4). Plain module that takes the
// Prisma client (or a transaction), so scripts/data/set-plan.ts applies the same rules as the app
// will once there is a payment provider.

export type RenewalErrorCode = "IN_BUSINESS_PLAN" | "SEATS_IN_USE";

export class RenewalError extends Error {
  constructor(readonly code: RenewalErrorCode) {
    super(code);
  }
}

// The minimal client surface the rules need (the app's client, the script's or a transaction)
interface RenewalClient {
  subscriptionSeat: { count(args: { where: { userId?: string; subscriptionId?: string } }): Promise<number> };
  subscription: {
    findUnique(args: { where: { userId: string }; select: { id: true; planType: true } }): Promise<{ id: string; planType: PlanType } | null>;
  };
  invitation: {
    count(args: { where: { subscriptionId: string; status: "PENDING"; expiresAt: { gt: Date } } }): Promise<number>;
  };
}

// A Business member gets Pro from the owner's plan and buys no plan of their own until they leave it.
// A Business owner with members (or pending plan invites) renews Business only: switching to
// Individual needs every member removed and every pending invite revoked first
export async function assertCanRenew(db: RenewalClient, userId: string, planType: PlanType, now = new Date()): Promise<void> {
  if ((await db.subscriptionSeat.count({ where: { userId } })) > 0) throw new RenewalError("IN_BUSINESS_PLAN");
  if (planType !== "INDIVIDUAL") return;

  const own = await db.subscription.findUnique({ where: { userId }, select: { id: true, planType: true } });
  if (own?.planType !== "BUSINESS") return;
  const [seats, pending] = await Promise.all([
    db.subscriptionSeat.count({ where: { subscriptionId: own.id } }),
    db.invitation.count({ where: { subscriptionId: own.id, status: "PENDING", expiresAt: { gt: now } } }),
  ]);
  if (seats + pending > 0) throw new RenewalError("SEATS_IN_USE");
}
