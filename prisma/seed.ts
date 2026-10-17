// Fills the Neon development branch with the demo data (src/lib/seed-data.ts): 2 organizations,
// 9 users with their memberships (Acme's 8, Panda Labs' owner Valeria), Nora without an organization,
// their plans (Jordan's Business plan seating Ana and Sofía, Valeria's expired Individual plan), 7
// surveys and their responses, with fixed ids and seeded counts. Then the owner account: Miguel
// Rayon, owner and only member of Leyinork, on Free.
//
//   npx prisma db seed
//
// Idempotent: it deletes what it seeded before (scoped to the two seeded organizations) and creates
// it again. Dates are relative to the run, so "last 30 days" always has data. Development only.
import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { UserAccount } from "../src/types/survey";
import {
  ID_KIND,
  buildAccounts,
  buildAllResponses,
  buildMemberships,
  buildOrganizations,
  buildSurveys,
  buildUsers,
  daysAgo,
  objectId,
} from "../src/lib/seed-data";

const DEV_PASSWORD = "panda-dev-1";
const BATCH_SIZE = 500;

// Owner account. Only the password's scrypt hash is stored here, generated once with
// `npx tsx scripts/hash-password.ts` (hidden prompt); the plain password is never written anywhere
const OWNER = {
  organizationId: objectId(ID_KIND.organization, 3),
  organizationName: "Leyinork",
  userId: objectId(ID_KIND.user, 9),
  name: "Miguel Rayon",
  email: "miguel@ellyonsoft.com",
  phone: "+528135574189",
};
const OWNER_PASSWORD_HASH =
  "dc3c7f2f666936ef495035714b1414b4:e77440ecc66fae316b1b50372557a0ee6679e598eb7a7de7ab400a001fd64be0745896dfc71eb6b3187c2d78c6a2e8c8ce3445c8547053afad1c7c6623b2693b";
const HASH_FORMAT = /^[0-9a-f]{32}:[0-9a-f]{128}$/;

// Same "salt:hash" (hex) scrypt format as src/lib/users/password.ts, which is server-only and
// cannot be imported here
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}

// Never against production: the URL must point at the development branch's endpoint
function assertDevelopmentDatabase(): string {
  const url = process.env.DATABASE_URL;
  const endpoint = process.env.NEON_DEV_ENDPOINT;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed with NODE_ENV=production");
  if (!endpoint) throw new Error("NEON_DEV_ENDPOINT is not set: add the development branch endpoint id to .env");
  const host = new URL(url).hostname;
  if (!host.startsWith(`${endpoint}.`) && !host.startsWith(`${endpoint}-pooler.`)) {
    throw new Error(`Refusing to seed ${host}: it is not the development endpoint (${endpoint})`);
  }
  return url;
}

const connectionString = assertDevelopmentDatabase();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log(`Seeding ${new URL(connectionString).hostname}`);

  const now = new Date();
  const surveys = buildSurveys(now);
  const responses = buildAllResponses(surveys, now);
  const users = buildUsers(now);
  const memberships = buildMemberships(now);
  const accounts = buildAccounts(now);
  // The active-survey counter must match the active surveys the seed creates
  const organizations = buildOrganizations(now).map((organization) => ({
    ...organization,
    activeSurveyCount: surveys.filter((s) => s.organizationId === organization.id && s.isActive).length,
  }));
  const organizationIds = organizations.map((organization) => organization.id);
  const passwordHash = hashPassword(DEV_PASSWORD);

  await prisma.$transaction(
    async (tx) => {
      // Previous seed, in foreign-key order (response items cascade from their response). Besides
      // the seeded organizations, any organization a seeded account created since (Nora on
      // /welcome) goes too: its owner is about to be deleted
      const emails = [...users, ...accounts].map((user) => user.email ?? "");
      const previous = await tx.organization.findMany({
        where: { OR: [{ id: { in: organizationIds } }, { owner: { email: { in: emails } } }] },
        select: { id: true },
      });
      const inSeededOrganizations = { organizationId: { in: previous.map((organization) => organization.id) } };
      await tx.surveyResponse.deleteMany({ where: inSeededOrganizations });
      await tx.answerOption.deleteMany({ where: { question: { survey: inSeededOrganizations } } });
      await tx.question.deleteMany({ where: { survey: inSeededOrganizations } });
      await tx.survey.deleteMany({ where: inSeededOrganizations });
      // Organizations before their owners (ownerId is Restrict); their memberships cascade
      await tx.organization.deleteMany({ where: { id: { in: previous.map((organization) => organization.id) } } });
      // Subscriptions are Restrict on their owner; seats cascade with their user
      await tx.subscription.deleteMany({ where: { user: { email: { in: emails } } } });
      await tx.user.deleteMany({ where: { email: { in: emails } } });

      // The account only: role and status live in the membership
      await tx.user.createMany({
        data: [...users, ...accounts].map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          phone: user.phone,
          isActive: true,
          deletedAt: user.deletedAt,
          passwordHash,
          emailVerified: user.createdAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
      });

      await tx.organization.createMany({ data: organizations });

      // Roles and status live only here
      await tx.membership.createMany({ data: memberships });

      await seedPlans(tx, users, now);

      for (const survey of surveys) {
        await tx.survey.create({
          data: {
            id: survey.id,
            organizationId: survey.organizationId,
            createdById: survey.createdById,
            code: survey.code,
            name: survey.name,
            description: survey.description,
            category: survey.category,
            isActive: survey.isActive,
            createdAt: survey.createdAt,
            updatedAt: survey.updatedAt,
            questions: {
              create: survey.questions.map((question, position) => ({
                id: question.id,
                text: question.text,
                position,
                createdAt: survey.createdAt,
                options: {
                  create: question.options.map((option, optionPosition) => ({
                    id: option.id,
                    type: option.type,
                    value: option.value,
                    label: option.label,
                    color: option.color,
                    position: optionPosition,
                    createdAt: survey.createdAt,
                  })),
                },
              })),
            },
          },
        });
      }

      for (const batch of chunk(responses, BATCH_SIZE)) {
        await tx.surveyResponse.createMany({
          data: batch.map(({ id, surveyId, organizationId, source, deviceId, locale, durationMs, createdAt }) => ({
            id,
            surveyId,
            organizationId,
            source,
            deviceId,
            locale,
            durationMs,
            createdAt,
          })),
        });
        await tx.responseItem.createMany({
          data: batch.flatMap((response) => response.items.map((item) => ({ ...item, responseId: response.id }))),
        });
      }
    },
    // Thousands of rows over the network: well above the 5 s default
    { timeout: 120_000, maxWait: 20_000 },
  );

  const counts = {
    organizations: await prisma.organization.count({ where: { id: { in: organizationIds } } }),
    memberships: await prisma.membership.count({ where: { organizationId: { in: organizationIds } } }),
    surveys: await prisma.survey.count({ where: { organizationId: { in: organizationIds } } }),
    questions: await prisma.question.count({ where: { survey: { organizationId: { in: organizationIds } } } }),
    options: await prisma.answerOption.count({ where: { question: { survey: { organizationId: { in: organizationIds } } } } }),
    responses: await prisma.surveyResponse.count({ where: { organizationId: { in: organizationIds } } }),
    items: await prisma.responseItem.count({ where: { response: { organizationId: { in: organizationIds } } } }),
    subscriptions: await prisma.subscription.count({ where: { user: { email: { in: users.map((user) => user.email ?? "") } } } }),
    seats: await prisma.subscriptionSeat.count({ where: { user: { email: { in: users.map((user) => user.email ?? "") } } } }),
  };
  await seedOwner(now);
  const owned = await prisma.organization.findUnique({
    where: { id: OWNER.organizationId },
    select: { name: true, owner: { select: { email: true } }, _count: { select: { memberships: true } } },
  });
  console.log(
    `${counts.organizations} organizations, ${counts.memberships} memberships, ${counts.surveys} surveys, ${counts.questions} questions, ` +
      `${counts.options} options, ${counts.responses} responses, ${counts.items} items, ` +
      `${counts.subscriptions} subscriptions, ${counts.seats} seats`,
  );
  console.log(
    `1 owner organization (${owned?.name}, ${owned?._count.memberships} member), 1 owner (${owned?.owner.email})`,
  );
}

// Plans to try every state (docs/subscriptions.md, section 9): Jordan pays a Business plan that seats
// Ana and Sofía; Valeria's Individual plan expired 3 days ago (Panda Labs falls back to the Free
// limit with 2 surveys still active); everyone else is on Free
async function seedPlans(tx: Prisma.TransactionClient, users: UserAccount[], now: Date) {
  const id = (email: string) => {
    const user = users.find((candidate) => candidate.email === email);
    if (!user) throw new Error(`Seed user ${email} not found`);
    return user.id;
  };

  const businessStart = daysAgo(now, 10);
  const business = await tx.subscription.create({
    data: {
      userId: id("jordan@acme.co"),
      planType: "BUSINESS",
      billingInterval: "MONTHLY",
      status: "ACTIVE",
      paidAt: businessStart,
      currentPeriodStart: businessStart,
      currentPeriodEnd: daysAgo(now, -20),
    },
  });
  await tx.subscriptionSeat.createMany({
    data: ["ana@acme.co", "sofia@acme.co"].map((email) => ({ subscriptionId: business.id, userId: id(email) })),
  });

  const expiredEnd = daysAgo(now, 3);
  const expiredStart = new Date(expiredEnd);
  expiredStart.setUTCFullYear(expiredStart.getUTCFullYear() - 1);
  await tx.subscription.create({
    data: {
      userId: id("valeria@pandalabs.dev"),
      planType: "INDIVIDUAL",
      billingInterval: "YEARLY",
      status: "ACTIVE",
      paidAt: expiredStart,
      currentPeriodStart: expiredStart,
      currentPeriodEnd: expiredEnd,
    },
  });
}

// Upserted, not deleted and recreated: Leyinork is a real account, so a re-seed keeps whatever its
// owner creates there, and only resets the organization's name and the owner's profile and password
async function seedOwner(now: Date) {
  if (!HASH_FORMAT.test(OWNER_PASSWORD_HASH)) {
    throw new Error('OWNER_PASSWORD_HASH is not set: run "npx tsx scripts/hash-password.ts" and paste the hash');
  }

  await prisma.$transaction(async (tx) => {
    // The email is unique: a different row holding it would block the upsert (its own organization
    // goes first, since ownerId is Restrict)
    const others = { email: OWNER.email, id: { not: OWNER.userId } };
    await tx.organization.deleteMany({ where: { owner: others } });
    await tx.user.deleteMany({ where: others });

    // The account first: the organization points at it (ownerId)
    const profile = {
      name: OWNER.name,
      email: OWNER.email,
      phone: OWNER.phone,
      isActive: true,
      deletedAt: null,
      passwordHash: OWNER_PASSWORD_HASH,
    };
    await tx.user.upsert({
      where: { id: OWNER.userId },
      create: { id: OWNER.userId, ...profile, emailVerified: now, createdAt: now, updatedAt: now },
      update: profile,
    });

    await tx.organization.upsert({
      where: { id: OWNER.organizationId },
      create: {
        id: OWNER.organizationId,
        name: OWNER.organizationName,
        ownerId: OWNER.userId,
        activeSurveyCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      update: { name: OWNER.organizationName, ownerId: OWNER.userId },
    });

    const membership = { role: "OWNER" as const, isActive: true };
    await tx.membership.upsert({
      where: { userId_organizationId: { userId: OWNER.userId, organizationId: OWNER.organizationId } },
      create: { userId: OWNER.userId, organizationId: OWNER.organizationId, ...membership, createdAt: now },
      update: membership,
    });
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
