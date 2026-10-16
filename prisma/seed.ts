// Fills the Neon development branch with the demo data the app shows today (src/lib/seed-data.ts):
// 2 organizations, 8 users, 5 surveys and their responses, with the mock's ids and counts.
//
//   npx prisma db seed
//
// Idempotent: it deletes what it seeded before (scoped to the two seeded organizations) and creates
// it again. Dates are relative to the run, so "last 30 days" always has data. Development only.
import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ACME_ID, buildAllResponses, buildOrganizations, buildSurveys, buildUsers } from "../src/lib/seed-data";

const DEV_PASSWORD = "panda-dev-1";
const BATCH_SIZE = 500;

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
          data: batch.map(({ items: _items, ...response }) => response),
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
  console.log(
    `${counts.organizations} organizations, ${counts.users} users, ${counts.surveys} surveys, ${counts.questions} questions, ` +
      `${counts.options} options, ${counts.responses} responses, ${counts.items} items`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
