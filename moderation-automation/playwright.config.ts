import { defineConfig, devices } from '@playwright/test';

// 127.0.0.1, not localhost: avoids an IPv4/IPv6 mismatch between Vite and
// Playwright's readiness check that intermittently timed out webServer startup.
const SAMPLE_APP_URL = 'http://127.0.0.1:3005';

export default defineConfig({
  testDir: './src/tests',
  // The toggle matrix and scenario suite change live moderation settings — only
  // run them when asked (npm run toggles:* / scenarios:*).
  testIgnore: process.env.RUN_TOGGLES === '1' ? [] : ['**/toggles/**', '**/scenarios/**'],
  // Start the sample app on the target App ID and prove a login works before any test.
  globalSetup: './src/preflight.ts',
  // Tests share one CometChat app and its Moderation lists — run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
  ],
  use: {
    baseURL: SAMPLE_APP_URL,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --strictPort',
    cwd: './sample-app',
    url: SAMPLE_APP_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
