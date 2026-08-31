import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["packages/contracts/src/**/*.ts"],
    },
    include: ["packages/**/*.test.ts"],
  },
});
