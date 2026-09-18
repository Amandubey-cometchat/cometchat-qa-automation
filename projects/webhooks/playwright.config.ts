import { defineConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
// Loads .env.<APP_ENV> (default staging-us) and fails fast with a clear
// message on an unconfirmed prod target. Doing this here — the first thing
// Playwright loads — means every spec/helper sees a consistent environment
// with no import-order surprises, and prod is blocked before any test runs.
import { getConfig } from './src/config/env';

const { appEnv, appId, region } = getConfig();

// Stamps which environment is actually producing reports/json/results.json.
// scripts/generate-coverage.ts reads this marker rather than its own
// separately-resolved APP_ENV — a report generated standalone (`npm run
// coverage`, no APP_ENV set) would otherwise silently mislabel a stale
// results.json from a *different* environment's last run. Verified live:
// this is exactly how prod-eu's results briefly got mislabeled "staging-us"
// during this project's development.
const jsonReportDir = path.join(__dirname, 'reports', 'json');
fs.mkdirSync(jsonReportDir, { recursive: true });
fs.writeFileSync(path.join(jsonReportDir, '.run-env.json'), JSON.stringify({ APP_ENV: appEnv, appId, region, writtenAt: Date.now() }));

// Real (non-gap) Legacy spec files assume the app's webhook config is
// manually switched to Legacy mode in the Dashboard — never true during a
// regular test run, where the app is expected to be in Modern mode (every
// other automated test depends on that). Without this, they'd show up as
// spurious "NOT RECEIVED?" failures in every npm run test:* run, since
// Legacy mode genuinely isn't active then. Excluded by default; only
// scripts/test-legacy.ts runs them, by setting RUN_LEGACY=1 to lift this.
// legacy.spec.ts (the registry-driven gap file) is NOT in this list — it's
// pure test.skip() calls with no live dependency, safe in every run, same
// as every other category's gap file.
const REAL_LEGACY_SPECS = [
  '**/tests/legacy/before-message.spec.ts',
  '**/tests/legacy/after-message.spec.ts',
  '**/tests/legacy/message-delivery-receipt-legacy.spec.ts',
  '**/tests/legacy/message-read-receipt-legacy.spec.ts',
  '**/tests/legacy/after-connection-status-changed.spec.ts',
];

export default defineConfig({
  testDir: './src/tests',
  testIgnore: process.env.RUN_LEGACY === '1' ? undefined : REAL_LEGACY_SPECS,
  timeout: 30000,
  // Per-test failure artifacts (error-context.md, traces, screenshots) —
  // Playwright's default is a bare top-level test-results/, which would sit
  // outside the reports/ tree everything else in this project writes to.
  outputDir: './reports/test-artifacts',
  // Tests share one external, stateful receiver (a single in-memory event
  // store keyed by nothing but trigger name) and trigger real side effects
  // against one shared CometChat app — running them in parallel lets one
  // test's resetEvents() wipe out an event another test is still polling
  // for. Keep this suite serial.
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['list'],
    // Machine-readable results scripts/generate-coverage.ts cross-references
    // against src/registry/webhook.registry.ts, and the receiver's
    // /dashboard reads via scripts/upload-test-results.ts.
    ['json', { outputFile: 'reports/json/results.json' }],
  ],
  // No browser project needed — these tests hit REST APIs, not a UI. The
  // one exception (src/clients/sdk.client.ts, driving a real CometChat SDK
  // session) launches its own Chromium instance directly via
  // playwright-core's chromium.launch(), independent of this config.
});
