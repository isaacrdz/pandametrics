import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { resolvePlan, type PlanRows, type PlanTier } from "@/lib/plans/plan";
import { subscriptionTag } from "@/lib/plans/tags";
import { userTag } from "@/lib/users/tags";
import { prisma } from "@/server/prisma";

// Plans on Prisma. The cached read returns the raw rows (status and dates); the plan itself is
// computed by the caller with the request's time, so the cache never holds a stale "Pro"

const SUBSCRIPTION_SELECT = {
  id: true,
  planType: true,
  billingInterval: true,
  status: true,
  paidAt: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  canceledAt: true,
} satisfies Prisma.SubscriptionSelect;

const PLAN_ROWS_SELECT = {
  subscription: { select: SUBSCRIPTION_SELECT },
  seat: { select: { subscription: { select: { ...SUBSCRIPTION_SELECT, user: { select: { name: true } } } } } },
} satisfies Prisma.UserSelect;

type PlanRowsPayload = Prisma.UserGetPayload<{ select: typeof PLAN_ROWS_SELECT }> | null;

function toPlanRows(row: PlanRowsPayload): PlanRows {
  if (!row) return { own: null, seat: null };
  const seat = row.seat?.subscription;
  return {
    own: row.subscription,
    seat: seat ? { subscription: seat, ownerName: seat.user.name } : null,
  };
}

// A user's subscription and seat. Tagged with the user (a seat added or removed) and every
// subscription read (a renewal by the Business owner reaches each member's cache). Short-lived as
// well: plans also change outside the app (scripts/data/set-plan.ts, later a payment webhook), and
// those changes show up within a minute or two without a restart
export async function loadPlanRows(userId: string): Promise<PlanRows> {
  "use cache";
  cacheLife("minutes");
  cacheTag(userTag(userId));

  const rows = toPlanRows(await prisma.user.findUnique({ where: { id: userId }, select: PLAN_ROWS_SELECT }));
  if (rows.own) cacheTag(subscriptionTag(rows.own.id));
  if (rows.seat) cacheTag(subscriptionTag(rows.seat.subscription.id));
  return rows;
}

// The organization owner's plan tier, read inside the caller's transaction (never cached): the
// limits it gives are checked against the database, not the page that sent the request
export async function organizationTier(tx: Prisma.TransactionClient, organizationId: string, now: Date): Promise<PlanTier> {
  const organization = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { owner: { select: PLAN_ROWS_SELECT } },
  });
  return resolvePlan(toPlanRows(organization?.owner ?? null), now).tier;
}
