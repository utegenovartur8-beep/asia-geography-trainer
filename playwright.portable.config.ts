import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/portable",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  outputDir: "test-results/portable",
  use: {
    browserName: "chromium",
    viewport: { width: 1366, height: 900 },
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
