import { defineConfig } from "vitest/config";

// Unit tests for pure logic (plans, limits, rate limits, auth paths). Services that run Prisma
// transactions against Neon are checked end to end instead (see context/current-feature.md history)
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    alias: {
      "@/": new URL("./src/", import.meta.url).pathname,
      "server-only": new URL("./test/stubs/server-only.ts", import.meta.url).pathname,
    },
  },
});
