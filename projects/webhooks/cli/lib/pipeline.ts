/**
 * Cross-platform orchestration of the exact same pipeline each existing
 * `npm run test:*` script encodes (open-dashboard -> clear-history ->
 * playwright test -> upload-results -> generate-coverage) — see
 * package.json. Those scripts wrap the sequence in `bash -c '...'`, which
 * doesn't run on a stock Windows machine without Git Bash. This module
 * calls the identical underlying files (scripts/open-dashboard.ts etc.) in
 * the identical order with the identical env vars, via Node's own
 * child_process — so run.sh/run.bat/cli/index.ts work the same way on every
 * platform without depending on bash. The original npm scripts are left
 * exactly as they were, for anyone who prefers running them directly.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRunLogger, RunLogger } from './file-logger';
import { openUrl } from './open';
import { AppEnvName } from './config-check';

const REPO_ROOT = path.join(__dirname, '..', '..');

function envFor(appEnv: AppEnvName): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, APP_ENV: appEnv };
  if (appEnv.startsWith('prod')) env.CONFIRM_PROD = 'yes';
  return env;
}

// On Windows, npm/npx are .cmd shims — spawn needs the explicit extension to
// run them without `shell: true`, which Node deprecates (DEP0190) for array
// args because they'd be re-concatenated and re-parsed by the shell. Every
// argument passed through this module is either a hardcoded literal or a
// registry-derived trigger id (see grepForCategories in cli/index.ts), never
// unsanitized user/external input, but avoiding shell:true entirely is the
// cleaner fix regardless.
function resolveCommand(cmd: string): string {
  return process.platform === 'win32' ? `${cmd}.cmd` : cmd;
}

function exec(cmd: string, args: string[], env: NodeJS.ProcessEnv, logger?: RunLogger): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(resolveCommand(cmd), args, {
      cwd: REPO_ROOT,
      env,
      stdio: logger ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    });
    if (logger && child.stdout && child.stderr) {
      child.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);
        logger.write(chunk.toString());
      });
      child.stderr.on('data', (chunk) => {
        process.stderr.write(chunk);
        logger.write(chunk.toString());
      });
    }
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

export interface SuiteOptions {
  grep?: string;
  /** Lifts playwright.config.ts's default exclusion of the real (non-gap) Notification specs — see that file's comment. Only meaningful once Custom Email/SMS Provider is actually configured in the Dashboard. */
  runNotification?: boolean;
}

export async function runSuite(appEnv: AppEnvName, { grep, runNotification }: SuiteOptions = {}): Promise<number> {
  const env = envFor(appEnv);
  if (runNotification) env.RUN_NOTIFICATION = '1';

  // Best-effort convenience steps — never block/fail the run (matches the
  // existing scripts' own documented behavior).
  await exec('npx', ['tsx', 'scripts/open-dashboard.ts'], env);
  await exec('npx', ['tsx', 'scripts/clear-history.ts'], env);

  const logger = createRunLogger(appEnv);
  console.log(`\nLogging this run to ${path.relative(REPO_ROOT, logger.filePath)}\n`);

  const testArgs = ['playwright', 'test', ...(grep ? ['--grep', grep] : [])];
  const code = await exec('npx', testArgs, env, logger);
  logger.close();

  await exec('npx', ['tsx', 'scripts/upload-test-results.ts'], env);
  await exec('npx', ['tsx', 'scripts/generate-coverage.ts'], env);

  printSummary(code);
  return code;
}

/** Legacy suite is its own guarded, interactive flow (scripts/test-legacy.ts) — never routed through runSuite. */
export async function runLegacy(appEnv: AppEnvName): Promise<number> {
  return exec('npx', ['tsx', 'scripts/test-legacy.ts'], envFor(appEnv));
}

export async function runValidate(appEnv: AppEnvName): Promise<number> {
  return exec('npx', ['tsx', 'cli/validate.ts'], envFor(appEnv));
}

export async function runCleanup(appEnv: AppEnvName): Promise<number> {
  return exec('npx', ['tsx', 'scripts/cleanup.ts'], envFor(appEnv));
}

export function openLastReport(): void {
  const reportPath = path.join(REPO_ROOT, 'reports', 'html', 'index.html');
  if (!fs.existsSync(reportPath)) {
    console.log('No report found yet — run a test suite first.');
    return;
  }
  console.log(`Opening ${path.relative(REPO_ROOT, reportPath)}`);
  openUrl(`file://${reportPath}`);
}

function printSummary(exitCode: number): void {
  const resultsPath = path.join(REPO_ROOT, 'reports', 'json', 'results.json');
  const line = '='.repeat(44);
  console.log(`\n${line}`);
  console.log('Webhook Automation Result');
  console.log(line);

  if (!fs.existsSync(resultsPath)) {
    console.log(exitCode === 0 ? 'Run finished (no results.json found to summarize).' : 'Run failed before producing results.json.');
    console.log(line + '\n');
    return;
  }

  try {
    const report = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    const stats = report.stats || {};
    console.log(`Passed:   ${stats.expected ?? '?'}`);
    console.log(`Failed:   ${stats.unexpected ?? '?'}`);
    console.log(`Flaky:    ${stats.flaky ?? '?'}`);
    console.log(`Skipped:  ${stats.skipped ?? '?'}`);
    if (typeof stats.duration === 'number') console.log(`Duration: ${(stats.duration / 1000).toFixed(1)}s`);
    console.log(`\nReport:   reports/html/index.html`);
    console.log(`Coverage: reports/coverage/webhook-coverage.md`);
  } catch {
    console.log('(Could not parse reports/json/results.json for a summary — see reports/html/index.html directly.)');
  }
  console.log(line + '\n');
}
