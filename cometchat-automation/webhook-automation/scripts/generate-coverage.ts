/**
 * Generates the webhook coverage report from src/registry/webhook.registry.ts
 * (the single source of truth for every webhook this project is responsible
 * for) cross-referenced with the most recent local Playwright run
 * (reports/json/results.json), for whichever environment that run targeted.
 *
 * Writes:
 *   reports/coverage/webhook-coverage.json - machine-readable, accumulates one slice per environment
 *   reports/coverage/webhook-coverage.md   - human-readable table, regenerated from the json each run
 * Prints a console report in the same shape.
 *
 * Run after a test run: `npm run coverage` (already wired into
 * `npm run test:staging` / `test:prod:*`).
 *
 * Deliberately does NOT import src/config/env — this script only reads
 * local JSON files and never talks to CometChat, so it shouldn't need
 * credentials or be subject to the prod-confirmation gate to run standalone.
 */
import fs from 'fs';
import path from 'path';
import { REGISTRY, CATEGORIES, WebhookRegistryEntry } from '../src/registry/webhook.registry';

const REPO_ROOT = path.join(__dirname, '..');
const RESULTS_FILE = path.join(REPO_ROOT, 'reports', 'json', 'results.json');
const RUN_ENV_MARKER = path.join(REPO_ROOT, 'reports', 'json', '.run-env.json');
const COVERAGE_JSON = path.join(REPO_ROOT, 'reports', 'coverage', 'webhook-coverage.json');
const COVERAGE_MD = path.join(REPO_ROOT, 'reports', 'coverage', 'webhook-coverage.md');

interface FlatResult {
  file: string;
  title: string;
  status: string;
  ok: boolean;
  error: string | null;
}

function flattenSpecs(suite: any, fileTitle: string, out: FlatResult[]) {
  for (const spec of suite.specs || []) {
    const t = spec.tests && spec.tests[0];
    const result = t && t.results && t.results[t.results.length - 1];
    if (!t || !result) continue;
    out.push({ file: fileTitle, title: spec.title, status: result.status, ok: spec.ok, error: result.error ? result.error.message : null });
  }
  for (const child of suite.suites || []) flattenSpecs(child, fileTitle, out);
}

function loadLatestRunResults(): { flat: FlatResult[] } | null {
  let raw: any;
  try {
    raw = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  } catch {
    return null;
  }
  const flat: FlatResult[] = [];
  for (const suite of raw.suites || []) flattenSpecs(suite, suite.file || suite.title, flat);
  return { flat };
}

// The environment that actually produced reports/json/results.json —
// stamped by playwright.config.ts at the start of that run — NOT read from
// this process's own APP_ENV. Prevents a standalone `npm run coverage`
// (different/no APP_ENV) from silently relabeling a stale, different
// environment's results as whatever APP_ENV happens to default to —
// verified live: this is exactly how prod-eu's results briefly got
// mislabeled "staging-us" earlier in this project's development.
function resolveRunEnvironment(): string {
  try {
    const marker = JSON.parse(fs.readFileSync(RUN_ENV_MARKER, 'utf-8'));
    if (marker.APP_ENV) return marker.APP_ENV;
  } catch {
    // fall through
  }
  console.warn(
    `[coverage] No reports/json/.run-env.json marker found — falling back to this process's own APP_ENV ` +
      `("${process.env.APP_ENV || 'staging-us'}"). This may not be the environment that actually produced ` +
      `reports/json/results.json. Run via npm run test:staging / test:prod:* to avoid this.`
  );
  return process.env.APP_ENV || 'staging-us';
}

function resolveActualStatus(entry: WebhookRegistryEntry, runResults: { flat: FlatResult[] } | null) {
  if (entry.status === 'BLOCKED' || entry.status === 'NOT_IMPLEMENTED') {
    return { runStatus: entry.status as string, error: null as string | null };
  }
  if (!runResults) return { runStatus: 'AUTOMATED (no run data)', error: null };

  // The JSON report's `file` field is relative to playwright.config.ts's
  // testDir ('src/tests') and includes the subfolder (e.g.
  // "group/group-created.spec.ts", "_shared/edge-cases.spec.ts") — not just
  // a basename. Registry entries store specFile relative to the repo root
  // (e.g. "src/tests/group/group-created.spec.ts"), so strip that prefix
  // rather than reducing to a basename, or every match silently fails.
  const specFileName = entry.specFile ? entry.specFile.replace(/^src\/tests\//, '') : null;
  const match = runResults.flat.find((r) => r.file === specFileName && entry.testTitleMatch && r.title.includes(entry.testTitleMatch));
  if (!match) return { runStatus: 'AUTOMATED (not in last run)', error: null };
  if (match.status === 'skipped') return { runStatus: 'SKIPPED', error: null };
  if (!match.ok) return { runStatus: 'FAILED', error: match.error };
  return { runStatus: 'PASSED', error: null };
}

function buildReport(appEnv: string) {
  const runResults = loadLatestRunResults();
  const rows = REGISTRY.map((entry) => {
    const { runStatus, error } = resolveActualStatus(entry, runResults);
    return { ...entry, runStatus, error };
  });

  const counts = { Total: rows.length, PASSED: 0, FAILED: 0, SKIPPED: 0, NOT_IMPLEMENTED: 0, BLOCKED: 0, OTHER: 0 };
  for (const r of rows) {
    if (r.runStatus === 'PASSED') counts.PASSED++;
    else if (r.runStatus === 'FAILED') counts.FAILED++;
    else if (r.runStatus === 'SKIPPED') counts.SKIPPED++;
    else if (r.status === 'NOT_IMPLEMENTED') counts.NOT_IMPLEMENTED++;
    else if (r.status === 'BLOCKED') counts.BLOCKED++;
    else counts.OTHER++;
  }

  return { environment: appEnv, generatedAt: new Date().toISOString(), counts, rows };
}

function loadExistingCoverage(): { environments: Record<string, any> } {
  try {
    return JSON.parse(fs.readFileSync(COVERAGE_JSON, 'utf-8'));
  } catch {
    return { environments: {} };
  }
}

function saveCoverage(store: { environments: Record<string, any> }) {
  fs.mkdirSync(path.dirname(COVERAGE_JSON), { recursive: true });
  fs.writeFileSync(COVERAGE_JSON, JSON.stringify(store, null, 2));
}

function printConsoleReport(report: ReturnType<typeof buildReport>) {
  const line = '='.repeat(56);
  console.log(line);
  console.log('COMETCHAT WEBHOOK AUTOMATION REPORT');
  console.log(line);
  console.log(`Environment: ${report.environment.toUpperCase()}`);
  console.log();

  for (const [category, entries] of Object.entries(CATEGORIES)) {
    console.log(category);
    console.log('-'.repeat(56));
    let categoryAutomated = 0;
    let categoryPassed = 0;
    for (const entry of entries) {
      const row = report.rows.find((r) => r.id === entry.id)!;
      console.log(`${entry.id.padEnd(35)} ${row.runStatus}`);
      if (entry.status !== 'BLOCKED') categoryAutomated++;
      if (row.runStatus === 'PASSED') categoryPassed++;
    }
    console.log(`  ${categoryPassed}/${entries.length} passed`);
    console.log();
  }

  console.log('-'.repeat(56));
  console.log(`TOTAL: ${report.counts.Total}`);
  console.log(`PASSED: ${report.counts.PASSED}`);
  console.log(`FAILED: ${report.counts.FAILED}`);
  console.log(`SKIPPED: ${report.counts.SKIPPED}`);
  console.log(`NOT IMPLEMENTED: ${report.counts.NOT_IMPLEMENTED}`);
  console.log(`BLOCKED: ${report.counts.BLOCKED}`);
  console.log('-'.repeat(56));

  const failed = report.rows.filter((r) => r.runStatus === 'FAILED');
  if (failed.length) {
    console.log();
    console.log('FAILURE DETAILS');
    console.log('-'.repeat(56));
    for (const f of failed) {
      console.log(`Webhook: ${f.id}`);
      console.log(`Expected: ${f.expectedEvent}`);
      console.log(`Reason: ${(f.error || '').split('\n')[0]}`);
      console.log();
    }
  }
}

function writeMarkdownReport(store: { environments: Record<string, any> }) {
  const lines: string[] = ['# CometChat Webhook Coverage Matrix', ''];
  lines.push(`_Generated ${new Date().toISOString()} from \`src/registry/webhook.registry.ts\`, cross-referenced with the latest local test run per environment._`);
  lines.push('');
  const envNames = Object.keys(store.environments);
  lines.push(`| Category | Webhook | Method | ${envNames.map((e) => e.toUpperCase()).join(' | ')} |`);
  lines.push(`|---|---|---|${envNames.map(() => '---').join('|')}|`);
  for (const entry of REGISTRY) {
    const cells = envNames.map((e) => {
      const row = store.environments[e].rows.find((r: any) => r.id === entry.id);
      return row ? row.runStatus : '—';
    });
    lines.push(`| ${entry.category} | ${entry.id} | ${entry.automationMethod} | ${cells.join(' | ')} |`);
  }
  lines.push('');

  lines.push('## Totals per environment');
  lines.push('');
  lines.push('| Environment | Total | Passed | Failed | Skipped | Not implemented | Blocked |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const [env, data] of Object.entries(store.environments)) {
    const c = (data as any).counts;
    lines.push(`| ${env} | ${c.Total} | ${c.PASSED} | ${c.FAILED} | ${c.SKIPPED} | ${c.NOT_IMPLEMENTED} | ${c.BLOCKED} |`);
  }
  lines.push('');

  fs.mkdirSync(path.dirname(COVERAGE_MD), { recursive: true });
  fs.writeFileSync(COVERAGE_MD, lines.join('\n'));
}

function main() {
  const appEnv = resolveRunEnvironment();
  const report = buildReport(appEnv);
  printConsoleReport(report);

  const store = loadExistingCoverage();
  store.environments[appEnv] = report;
  saveCoverage(store);
  writeMarkdownReport(store);

  console.log(`\nWritten: ${path.relative(REPO_ROOT, COVERAGE_JSON)}, ${path.relative(REPO_ROOT, COVERAGE_MD)}`);
}

main();
