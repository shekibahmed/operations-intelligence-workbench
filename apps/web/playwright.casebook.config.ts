import { defineConfig } from "@playwright/test";

// The default command reads from disk with no application server. The optional
// HTTP project uses a freshly built app and owns its server even outside CI.
const http = process.env.CASEBOOK_HTTP === "1";
const port = 4318;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "casebook.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    javaScriptEnabled: false,
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    { name: "casebook-file", grepInvert: /@http/ },
    ...(http ? [{ name: "casebook-http-no-database", grep: /@http/, use: { baseURL } }] : []),
  ],
  ...(http ? {
    webServer: {
      command: `pnpm run start --hostname 127.0.0.1 --port ${port}`,
      url: `${baseURL}/casebook/a-142-repeat-fault.html`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: "postgresql://casebook_reader:casebook_reader@127.0.0.1:1/casebook_unavailable",
        SESSION_SECRET: "e2e-test-session-secret-not-for-production-use",
        OIW_RATE_LIMIT_STORE: "memory",
      },
    },
  } : {}),
});
