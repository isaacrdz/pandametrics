// Database connection check: yarn db:test
// Builds its own client (src/server/prisma.ts is server-only and cannot load outside Next),
// runs SELECT 1 against DATABASE_URL and counts the rows of every table.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log(`Host: ${new URL(connectionString!).hostname}`);
  await prisma.$queryRaw`SELECT 1`;
  console.log("Connection OK");

  const counts = {
    Organization: await prisma.organization.count(),
    User: await prisma.user.count(),
    Account: await prisma.account.count(),
    Session: await prisma.session.count(),
    VerificationToken: await prisma.verificationToken.count(),
    Survey: await prisma.survey.count(),
    Question: await prisma.question.count(),
    AnswerOption: await prisma.answerOption.count(),
    SurveyResponse: await prisma.surveyResponse.count(),
    ResponseItem: await prisma.responseItem.count(),
  };
  console.table(counts);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
