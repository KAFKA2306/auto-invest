import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host --port 4173",
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
};

export default config;
