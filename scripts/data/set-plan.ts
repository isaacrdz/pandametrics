// Sets a user's plan by hand while there is no payment provider (docs/subscriptions.md, section 9).
// Upserts the user's own Subscription with a period starting today; renewing is running it again.
//
//   npx tsx scripts/data/set-plan.ts --email jordan@acme.co --type BUSINESS --interval MONTHLY
//   npx tsx scripts/data/set-plan.ts --email valeria@pandalabs.dev --type INDIVIDUAL --interval YEARLY --expired
//   npx tsx scripts/data/set-plan.ts --email jordan@acme.co --type BUSINESS --interval MONTHLY --ends-in-minutes 1
//   npx tsx scripts/data/set-plan.ts --email nora@example.com --remove
//
// Options: --status ACTIVE|CANCELED|PAST_DUE|INCOMPLETE (default ACTIVE), --expired (the period
// ended yesterday), --ends-in-minutes N (to try an expiry live), --remove (back to Free; a Business
// plan's seats go with it). Development branch only, unless --production is passed explicitly.
import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const PLAN_TYPES = ["INDIVIDUAL", "BUSINESS"] as const;
const INTERVALS = ["MONTHLY", "YEARLY"] as const;
const STATUSES = ["ACTIVE", "CANCELED", "PAST_DUE", "INCOMPLETE"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    type: { type: "string" },
    interval: { type: "string" },
    status: { type: "string", default: "ACTIVE" },
    expired: { type: "boolean", default: false },
    "ends-in-minutes": { type: "string" },
    remove: { type: "boolean", default: false },
    production: { type: "boolean", default: false },
  },
});

function oneOf<T extends string>(name: string, value: string | undefined, allowed: readonly T[]): T {
  if (!value || !(allowed as readonly string[]).includes(value)) {
    throw new Error(`--${name} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

// The same guard as the seed: the development branch's endpoint, unless --production
function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (values.production) return url;
  const endpoint = process.env.NEON_DEV_ENDPOINT;
  if (!endpoint) throw new Error("NEON_DEV_ENDPOINT is not set: add the development branch endpoint id to .env");
  const host = new URL(url).hostname;
  if (!host.startsWith(`${endpoint}.`) && !host.startsWith(`${endpoint}-pooler.`)) {
    throw new Error(`Refusing to change ${host}: it is not the development endpoint (${endpoint}). Pass --production on purpose.`);
  }
  return url;
}

// One month or one year from the start
function periodEnd(start: Date, interval: (typeof INTERVALS)[number]): Date {
  const end = new Date(start);
  if (interval === "MONTHLY") end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}

async function main() {
  const email = values.email?.trim().toLowerCase();
  if (!email) throw new Error("--email is required");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString() }) });
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
    if (!user) throw new Error(`No user with email ${email}`);

    if (values.remove) {
      const { count } = await prisma.subscription.deleteMany({ where: { userId: user.id } });
      console.log(count ? `${email}: subscription removed, back to Free` : `${email}: already on Free`);
      return;
    }

    const planType = oneOf("type", values.type, PLAN_TYPES);
    const billingInterval = oneOf("interval", values.interval, INTERVALS);
    const status = oneOf("status", values.status, STATUSES);

    const now = new Date();
    let currentPeriodStart = now;
    let currentPeriodEnd = periodEnd(now, billingInterval);
    if (values.expired) {
      // A whole period that ended yesterday
      currentPeriodEnd = new Date(now.getTime() - DAY_MS);
      currentPeriodStart = new Date(currentPeriodEnd);
      if (billingInterval === "MONTHLY") currentPeriodStart.setUTCMonth(currentPeriodStart.getUTCMonth() - 1);
      else currentPeriodStart.setUTCFullYear(currentPeriodStart.getUTCFullYear() - 1);
    } else if (values["ends-in-minutes"]) {
      const minutes = Number(values["ends-in-minutes"]);
      if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("--ends-in-minutes must be a positive number");
      currentPeriodEnd = new Date(now.getTime() + minutes * 60_000);
    }

    const data = {
      planType,
      billingInterval,
      status,
      paidAt: status === "INCOMPLETE" ? null : currentPeriodStart,
      currentPeriodStart,
      currentPeriodEnd,
      canceledAt: status === "CANCELED" ? now : null,
    };
    await prisma.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
    console.log(
      `${email}: ${planType} ${billingInterval} ${status}, ${currentPeriodStart.toISOString()} → ${currentPeriodEnd.toISOString()}`,
    );
    console.log("A running app shows it within a minute or two (its cached plan is short-lived), or right away after a restart.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
