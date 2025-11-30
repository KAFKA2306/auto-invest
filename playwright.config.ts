import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4173",
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "PORT=4173 npm run dev -- --host --port 4173",
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
};

export default config;
