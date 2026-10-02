import { defineConfig } from "@playwright/test";

const port = Number(process.env.CASEBOOK_CAPTURE_PORT);
if (process.env.CASEBOOK_CAPTURE !== "1" || !Number.isInteger(port) || port < 1024 || !process.env.CASEBOOK_CAPTURE_RAW) {
  throw new Error("Use pnpm casebook:capture: this configuration requires the runner's owned server and private staging directory");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "casebook-capture.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 150_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 900 },
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  // The explicit runner builds and starts its own server; no existing server is reusable.
});
