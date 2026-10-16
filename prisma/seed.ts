// Fills the Neon development branch with the demo data the app shows today (src/lib/seed-data.ts):
// 2 organizations, 8 users, 5 surveys and their responses, with the mock's ids and counts. Then the
// owner account: Miguel Rayon, owner and only member of Leyinork.
//
//   npx prisma db seed
//
// Idempotent: it deletes what it seeded before (scoped to the two seeded organizations) and creates
// it again. Dates are relative to the run, so "last 30 days" always has data. Development only.
import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  ACME_ID,
  ID_KIND,
  buildAllResponses,
  buildOrganizations,
  buildSurveys,
  buildUsers,
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
  // The active-survey counter must match the active surveys the seed creates
  const organizations = buildOrganizations(now).map((organization) => ({
    ...organization,
    activeSurveyCount: surveys.filter((s) => s.organizationId === organization.id && s.isActive).length,
  }));
  const organizationIds = organizations.map((organization) => organization.id);
  const passwordHash = hashPassword(DEV_PASSWORD);

  await prisma.$transaction(
    async (tx) => {
      // Previous seed, in foreign-key order (response items cascade from their response)
      const inSeededOrganizations = { organizationId: { in: organizationIds } };
      await tx.surveyResponse.deleteMany({ where: inSeededOrganizations });
      await tx.answerOption.deleteMany({ where: { question: { survey: inSeededOrganizations } } });
      await tx.question.deleteMany({ where: { survey: inSeededOrganizations } });
      await tx.survey.deleteMany({ where: inSeededOrganizations });
      await tx.user.deleteMany({
        where: { OR: [inSeededOrganizations, { email: { in: users.map((user) => user.email ?? "") } }] },
      });
      await tx.organization.deleteMany({ where: { id: { in: organizationIds } } });

      await tx.organization.createMany({ data: organizations });

      await tx.user.createMany({
        data: users.map((user) => ({ ...user, passwordHash, emailVerified: user.createdAt })),
      });

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
    users: await prisma.user.count({ where: { organizationId: ACME_ID } }),
    surveys: await prisma.survey.count({ where: { organizationId: { in: organizationIds } } }),
    questions: await prisma.question.count({ where: { survey: { organizationId: { in: organizationIds } } } }),
    options: await prisma.answerOption.count({ where: { question: { survey: { organizationId: { in: organizationIds } } } } }),
    responses: await prisma.surveyResponse.count({ where: { organizationId: { in: organizationIds } } }),
    items: await prisma.responseItem.count({ where: { response: { organizationId: { in: organizationIds } } } }),
  };
  await seedOwner(now);
  const owner = await prisma.user.findUnique({ where: { email: OWNER.email }, select: { role: true, organization: { select: { name: true, users: { select: { id: true } } } } } });
  console.log(
    `${counts.organizations} organizations, ${counts.users} users, ${counts.surveys} surveys, ${counts.questions} questions, ` +
      `${counts.options} options, ${counts.responses} responses, ${counts.items} items`,
  );
  console.log(
    `1 owner organization (${owner?.organization?.name}, ${owner?.organization?.users.length} member), 1 owner (${OWNER.email}, ${owner?.role})`,
  );
}

// Upserted, not deleted and recreated: Leyinork is a real account, so a re-seed keeps whatever its
// owner creates there, and only resets the organization's name and the owner's profile and password
async function seedOwner(now: Date) {
  if (!HASH_FORMAT.test(OWNER_PASSWORD_HASH)) {
    throw new Error('OWNER_PASSWORD_HASH is not set: run "npx tsx scripts/hash-password.ts" and paste the hash');
  }

  await prisma.$transaction(async (tx) => {
    // The email is unique: a different row holding it would block the upsert
    await tx.user.deleteMany({ where: { email: OWNER.email, id: { not: OWNER.userId } } });

    await tx.organization.upsert({
      where: { id: OWNER.organizationId },
      create: { id: OWNER.organizationId, name: OWNER.organizationName, activeSurveyCount: 0, createdAt: now, updatedAt: now },
      update: { name: OWNER.organizationName },
    });

    const profile = {
      name: OWNER.name,
      email: OWNER.email,
      phone: OWNER.phone,
      role: "OWNER" as const,
      isActive: true,
      deletedAt: null,
      organizationId: OWNER.organizationId,
      passwordHash: OWNER_PASSWORD_HASH,
    };
    await tx.user.upsert({
      where: { id: OWNER.userId },
      create: { id: OWNER.userId, ...profile, emailVerified: now, createdAt: now, updatedAt: now },
      update: profile,
    });
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
