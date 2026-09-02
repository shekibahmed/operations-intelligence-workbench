import path from "node:path";

import { defineConfig } from "vitest/config";

const repositoryRoot = path.resolve(import.meta.dirname, "..", "..");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(repositoryRoot, "apps/web/src"),
      "@oiw/application": path.resolve(repositoryRoot, "packages/application/src/index.ts"),
      "next/headers": path.resolve(repositoryRoot, "tests/security/next-headers.mock.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/security/**/*.test.ts"],
  },
});
