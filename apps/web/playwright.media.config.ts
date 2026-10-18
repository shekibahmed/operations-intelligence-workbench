import { defineConfig } from "@playwright/test";

const port = Number(process.env.MEDIA_CAPTURE_PORT);
if (process.env.MEDIA_CAPTURE !== "1" || !Number.isInteger(port) || port < 1024 || !process.env.MEDIA_CAPTURE_OUT) {
  throw new Error("Use pnpm media:capture: this configuration requires MEDIA_CAPTURE=1, MEDIA_CAPTURE_PORT and MEDIA_CAPTURE_OUT from the runner's owned server");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "media-capture.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // One pack walkthrough runs at human pace for a couple of minutes.
  timeout: 420_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 800 },
    screenshot: "off",
    trace: "off",
    video: "off",
    // Slows every automation action a little so the recording reads at human pace.
    launchOptions: { slowMo: 120 },
  },
  // The explicit runner builds and starts its own server; no existing server is reusable.
});
