import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4300",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm run build && pnpm run start --port 4300",
    url: "http://127.0.0.1:4300",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // `next start` runs in production mode, where a real SESSION_SECRET is
      // required (src/lib/server/session.ts) — this is a fixed test-only
      // value, not a real deployment secret.
      SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-test-session-secret-not-for-production-use",
    },
  },
});
