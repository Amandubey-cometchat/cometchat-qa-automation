/**
 * Main CLI entry point — `npm run webhook`, and what run.sh/run.bat hand off
 * to after bootstrapping Node/deps/browsers. No args -> interactive menu.
 * With args -> the same actions run non-interactively (see printUsage()).
 *
 * Deliberately never imports src/config/env.ts directly (see
 * cli/lib/config-check.ts's header comment) — every environment-specific
 * action is a spawned child process (cli/lib/pipeline.ts), each of which
 * gets its own correct, freshly-resolved APP_ENV.
 */
import readline from 'readline/promises';
import { CATEGORIES, WebhookCategory } from '../src/registry/webhook.registry';
import { APP_ENVS, AppEnvName, checkConfig, checkAllConfigs } from './lib/config-check';
import { runWizard } from './wizard';
import { runSuite, runLegacy, runValidate, runCleanup, openLastReport } from './lib/pipeline';

const MENU_CATEGORIES: { label: string; categories: WebhookCategory[]; key: string }[] = [
  { key: 'group', label: 'Group webhooks', categories: ['GROUP'] },
  { key: 'message', label: 'Message webhooks', categories: ['MESSAGE'] },
  { key: 'calls', label: 'Calls & Meetings webhooks', categories: ['CALLS', 'MEETINGS'] },
  { key: 'campaign', label: 'Campaign webhooks', categories: ['CAMPAIGN'] },
  { key: 'user', label: 'User webhooks', categories: ['USER'] },
  { key: 'moderation', label: 'Moderation webhooks', categories: ['MODERATION'] },
  { key: 'legacy', label: 'Legacy webhooks (guarded, interactive)', categories: ['LEGACY'] },
  { key: 'notification', label: 'Notification webhooks (needs Custom Email/SMS Provider configured — see README)', categories: ['NOTIFICATION'] },
];

function grepForCategories(categories: WebhookCategory[]): string {
  return categories
    .flatMap((c) => CATEGORIES[c].map((entry) => entry.id))
    .join('|');
}

function envLabel(env: AppEnvName): string {
  return env === 'staging-us' ? 'Staging (staging-us)' : `Production — ${env.split('-')[1].toUpperCase()} (${env})`;
}

async function ensureConfigured(rl: readline.Interface, env: AppEnvName): Promise<boolean> {
  const status = checkConfig(env);
  if (status.valid) return true;

  console.log(`\n"${env}" isn't configured yet (missing: ${status.missing.join(', ')}).`);
  const answer = (await rl.question('Run first-time setup for it now? [Y/n]: ')).trim().toLowerCase();
  if (answer === 'n' || answer === 'no') return false;

  await runWizard(env, rl);
  return checkConfig(env).valid;
}

async function chooseEnvironment(rl: readline.Interface): Promise<AppEnvName | null> {
  console.log('\nEnvironment:');
  APP_ENVS.forEach((env, i) => {
    const status = checkConfig(env);
    console.log(`  ${i + 1}) ${envLabel(env)}  ${status.valid ? '✓ configured' : '⚠ needs setup'}`);
  });
  console.log('  0) Back');
  const choice = (await rl.question('\nSelect an environment: ')).trim();
  const idx = Number(choice) - 1;
  if (choice === '0' || Number.isNaN(idx)) return null;
  const env = APP_ENVS[idx];
  if (!env) {
    console.log('Not a valid choice.');
    return chooseEnvironment(rl);
  }
  return env;
}

async function chooseCategory(rl: readline.Interface): Promise<{ categories: WebhookCategory[] } | 'all' | null> {
  console.log('\nWhich webhooks?');
  console.log('  1) All webhook tests');
  MENU_CATEGORIES.forEach((c, i) => console.log(`  ${i + 2}) ${c.label}`));
  console.log('  0) Back');
  const choice = (await rl.question('\nSelect: ')).trim();
  if (choice === '0') return null;
  if (choice === '1') return 'all';
  const entry = MENU_CATEGORIES[Number(choice) - 2];
  if (!entry) {
    console.log('Not a valid choice.');
    return chooseCategory(rl);
  }
  return { categories: entry.categories };
}

async function handleRunTests(rl: readline.Interface): Promise<void> {
  const env = await chooseEnvironment(rl);
  if (!env) return;
  if (!(await ensureConfigured(rl, env))) return;

  const pick = await chooseCategory(rl);
  if (pick === null) return;

  if (pick !== 'all' && pick.categories.includes('LEGACY')) {
    console.log('\nLegacy webhooks require a manual Dashboard mode switch — see README "Legacy webhooks".');
    const proceed = (await rl.question('Continue with the guarded Legacy flow? [y/N]: ')).trim().toLowerCase();
    if (proceed !== 'y' && proceed !== 'yes') return;
    await runLegacy(env);
    return;
  }

  if (pick !== 'all' && pick.categories.includes('NOTIFICATION')) {
    console.log('\nNotification webhooks require Custom Email/SMS Provider configured in the Dashboard first — see README "Notifications".');
    const proceed = (await rl.question('Has that been configured for this environment? [y/N]: ')).trim().toLowerCase();
    if (proceed !== 'y' && proceed !== 'yes') return;
    await runSuite(env, { grep: grepForCategories(pick.categories), runNotification: true });
    return;
  }

  const grep = pick === 'all' ? undefined : grepForCategories(pick.categories);
  await runSuite(env, { grep });
}

async function handleValidate(rl: readline.Interface): Promise<void> {
  const env = await chooseEnvironment(rl);
  if (!env) return;
  await runValidate(env);
}

async function handleCleanup(rl: readline.Interface): Promise<void> {
  const env = await chooseEnvironment(rl);
  if (!env) return;
  if (!(await ensureConfigured(rl, env))) return;
  await runCleanup(env);
}

async function handleConfigure(rl: readline.Interface): Promise<void> {
  const env = await chooseEnvironment(rl);
  if (!env) return;
  await runWizard(env, rl);
}

function printMainMenu(): void {
  const statuses = checkAllConfigs();
  const configuredCount = statuses.filter((s) => s.valid).length;
  console.log('\n' + '='.repeat(44));
  console.log('  CometChat Webhook Automation');
  console.log('='.repeat(44));
  console.log(`  Environments configured: ${configuredCount}/${statuses.length}\n`);
  console.log('  1) Run tests');
  console.log('  2) Validate configuration');
  console.log('  3) Configure an environment (setup wizard)');
  console.log('  4) Clean up stray test data');
  console.log('  5) Open last HTML report');
  console.log('  6) Exit');
}

async function interactiveMenu(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (checkAllConfigs().every((s) => !s.exists)) {
      console.log("No environment is configured yet — let's set one up.");
      await runWizard('staging-us', rl);
    }
    while (true) {
      printMainMenu();
      const choice = (await rl.question('\nSelect an option: ')).trim();
      if (choice === '1') await handleRunTests(rl);
      else if (choice === '2') await handleValidate(rl);
      else if (choice === '3') await handleConfigure(rl);
      else if (choice === '4') await handleCleanup(rl);
      else if (choice === '5') openLastReport();
      else if (choice === '6' || choice.toLowerCase() === 'exit') break;
      else console.log('Not a valid choice.');
    }
  } finally {
    rl.close();
  }
}

// ---- Non-interactive shortcuts (./run.sh <command>) ----

const ENV_ARG: Record<string, AppEnvName> = {
  staging: 'staging-us',
  'prod:eu': 'prod-eu',
  'prod:us': 'prod-us',
  'prod:in': 'prod-in',
};

const CATEGORY_ARG: Record<string, WebhookCategory[]> = {
  group: ['GROUP'],
  message: ['MESSAGE'],
  calls: ['CALLS', 'MEETINGS'],
  meetings: ['CALLS', 'MEETINGS'],
  campaign: ['CAMPAIGN'],
  user: ['USER'],
  moderation: ['MODERATION'],
  notification: ['NOTIFICATION'],
};

// Categories whose real specs are excluded by default in playwright.config.ts
// pending manual Dashboard config — see cli/lib/pipeline.ts's runNotification option.
const CATEGORIES_NEEDING_RUN_FLAG: Partial<Record<string, boolean>> = { notification: true };

function printUsage(): void {
  console.log(`
Usage: ./run.sh [command] [environment]

  ./run.sh                    Interactive menu
  ./run.sh validate [env]     Validate configuration (default: staging)
  ./run.sh clean [env]        Sweep stray qa-* test data (default: staging)
  ./run.sh report             Open the last HTML report

  ./run.sh all [env]          Run every webhook test        (default env: staging)
  ./run.sh group [env]        Run Group webhooks
  ./run.sh message [env]      Run Message webhooks
  ./run.sh calls [env]        Run Calls & Meetings webhooks
  ./run.sh campaign [env]     Run Campaign webhooks
  ./run.sh user [env]         Run User webhooks
  ./run.sh moderation [env]   Run Moderation webhooks
  ./run.sh legacy [env]       Run the guarded Legacy flow
  ./run.sh notification [env] Run Notification webhooks (needs Custom Email/SMS Provider configured first — see README)

  env is one of: staging (default), prod:eu, prod:us, prod:in
  ("prod" alone is refused — production is 3 separate regions; be specific)
`);
}

function resolveEnvArg(arg: string | undefined): AppEnvName | null {
  if (!arg) return 'staging-us';
  return ENV_ARG[arg] || null;
}

async function nonInteractive(args: string[]): Promise<number> {
  const [command, envArg] = args;

  if (command === 'validate') {
    const env = resolveEnvArg(envArg);
    if (!env) return usageError(`Unknown environment "${envArg}"`);
    return runValidate(env);
  }
  if (command === 'clean') {
    const env = resolveEnvArg(envArg);
    if (!env) return usageError(`Unknown environment "${envArg}"`);
    return runCleanup(env);
  }
  if (command === 'report') {
    openLastReport();
    return 0;
  }
  if (command === 'prod') {
    console.log('Production spans 3 regions — run one of: ./run.sh <category|all> prod:eu | prod:us | prod:in');
    return 1;
  }
  if (command === 'all' || command in CATEGORY_ARG || command === 'legacy') {
    const env = resolveEnvArg(envArg);
    if (!env) return usageError(`Unknown environment "${envArg}"`);
    const configOk = checkConfig(env).valid;
    if (!configOk) {
      console.log(`"${env}" isn't configured yet. Run ./run.sh (no args) once to go through first-time setup, or ./run.sh validate ${envArg || ''} to see exactly what's missing.`);
      return 1;
    }
    if (command === 'legacy') return runLegacy(env);
    // PLAYWRIGHT_GREP lets a CI workflow_dispatch input narrow an "all" run
    // without needing a dedicated CLI flag — see .github/workflows/webhook-tests.yml.
    const grep = command === 'all' ? process.env.PLAYWRIGHT_GREP || undefined : grepForCategories(CATEGORY_ARG[command]);
    return runSuite(env, { grep, runNotification: CATEGORIES_NEEDING_RUN_FLAG[command] });
  }

  printUsage();
  return command ? 1 : 0;
}

function usageError(message: string): number {
  console.log(message);
  printUsage();
  return 1;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    // First-run wizard (if needed) happens inside interactiveMenu(), sharing
    // its one readline.Interface for the whole session.
    await interactiveMenu();
    return;
  }

  if (args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return;
  }

  const code = await nonInteractive(args);
  process.exitCode = code;
}

main();
