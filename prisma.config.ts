import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma CLI configuration (Prisma 7: the connection URL lives here, not in schema.prisma).
// The CLI uses the direct (unpooled) connection, which migrations and Studio need; the app
// connects through the pooled DATABASE_URL (src/server/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // npx prisma db seed (Prisma 7 no longer runs it from migrate dev / reset)
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
