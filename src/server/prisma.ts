import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One Prisma client per server process. The app connects through Neon's pooled URL
// (DATABASE_URL); the CLI uses the direct one from prisma.config.ts. Not used by the app yet:
// the services still read the in-memory stores until they move to Prisma.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Survives Fast Refresh in development instead of opening a new pool on every edit
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
