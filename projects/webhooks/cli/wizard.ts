/**
 * First-run configuration wizard. Writes .env.<env> from .env.example's own
 * template (so its field comments/guidance stay the single source of truth,
 * never re-authored here) with values substituted. Deliberately does NOT
 * import src/config/env.ts (see cli/lib/config-check.ts for why) — this
 * file only ever reads REQUIRED_KEYS from the side-effect-free
 * config.schema.ts. Only runs when config-check.ts reports missing/invalid
 * config for the target environment — never on a normal run.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline/promises';
import { REQUIRED_KEYS } from '../src/config/config.schema';
import { AppEnvName, envFilePath } from './lib/config-check';

const REPO_ROOT = path.join(__dirname, '..');
const ENV_EXAMPLE_PATH = path.join(REPO_ROOT, '.env.example');

/**
 * Builds the "Deploy to Render" button URL for whichever repo the user
 * actually cloned/forked, read from their own git remote rather than
 * hardcoded — a hardcoded URL would deploy someone else's fork's code onto
 * a stranger's Render account, which is exactly wrong. Returns null (never
 * throws) if there's no remote yet, e.g. a repo downloaded as a zip rather
 * than cloned.
 */
function renderDeployUrl(): string | null {
  try {
    const remote = execSync('git remote get-url origin', { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const httpsUrl = remote
      .replace(/^git@([^:]+):/, 'https://$1/')
      .replace(/\.git$/, '');
    if (!httpsUrl.startsWith('https://')) return null;
    return `https://render.com/deploy?repo=${httpsUrl}`;
  } catch {
    return null;
  }
}

interface FieldMeta {
  envVar: string;
  label: string;
  secret?: boolean;
  default?: string;
}

const FIELD_META: Record<string, FieldMeta> = {
  appId: { envVar: 'COMETCHAT_APP_ID', label: 'CometChat App ID' },
  region: { envVar: 'COMETCHAT_REGION', label: 'Region (us / eu / in)', default: 'us' },
  restApiKey: { envVar: 'COMETCHAT_REST_API_KEY', label: 'REST API Key (fullAccess scope)', secret: true },
  webhookReceiverUrl: {
    envVar: 'WEBHOOK_RECEIVER_URL',
    label: "Webhook Receiver URL (your deployed receiver + '/webhook')",
  },
  webhookBasicAuthUser: { envVar: 'WEBHOOK_BASIC_AUTH_USER', label: 'Receiver Basic Auth username', default: 'qa' },
  webhookBasicAuthPass: { envVar: 'WEBHOOK_BASIC_AUTH_PASS', label: 'Receiver Basic Auth password', secret: true },
  receiverQueryUrl: { envVar: 'RECEIVER_QUERY_URL', label: 'Receiver base URL (same host, no /webhook path)' },
};

function maskTail(value: string): string {
  if (value.length <= 4) return '*'.repeat(value.length);
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

/** Reads one line of visible input via the shared readline interface. */
async function askPlain(rl: readline.Interface, query: string): Promise<string> {
  return (await rl.question(query)).trim();
}

// Raw key codes read in terminal raw mode, built via String.fromCharCode
// rather than embedded as literal control-byte characters — keeps this
// source file plain ASCII and safe to view/diff/edit with ordinary tools.
const CTRL_C_CODE = 3;
const CTRL_D_CODE = 4;
const DEL_CODE = 127; // what most terminals actually send for Backspace

const CTRL_C = String.fromCharCode(CTRL_C_CODE);
const KEY_ENTER = ['\n', '\r', String.fromCharCode(CTRL_D_CODE)];
const KEY_BACKSPACE = [String.fromCharCode(DEL_CODE), '\b'];

/**
 * Reads one line of input with each keystroke echoed as `*`, without adding
 * a dependency. Pauses the shared readline interface's stdin consumption
 * for the duration so the two input paths never race over the same stream.
 */
function askHidden(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(query);
    const stdin = process.stdin;
    rl.pause();
    const wasRaw = stdin.isRaw;
    stdin.resume();
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    let value = '';
    const cleanup = () => {
      stdin.removeListener('data', onData);
      if (stdin.isTTY) stdin.setRawMode(!!wasRaw);
      rl.resume();
    };
    const onData = (char: string) => {
      if (KEY_ENTER.includes(char)) {
        cleanup();
        process.stdout.write('\n');
        resolve(value.trim());
        return;
      }
      if (char === CTRL_C) {
        cleanup();
        process.stdout.write('\n');
        process.exit(130);
      }
      if (KEY_BACKSPACE.includes(char)) {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      if (char >= ' ') {
        value += char;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

/**
 * Takes the caller's readline.Interface rather than creating its own — the
 * interactive menu (cli/index.ts) holds one open for the whole session, and
 * a second concurrent Interface on the same stdin would race with it for
 * keystrokes. Callers that don't already have one (a fresh, args-less
 * `./run.sh` with zero configured environments) create a short-lived one
 * just for this call.
 */
export async function runWizard(env: AppEnvName, rl: readline.Interface): Promise<void> {
  console.log(`\nFirst-time setup for "${env}"`);
  console.log('Values come from your CometChat Dashboard (App ID/Region/REST API Key) and your');
  console.log('deployed receiver (see README -> "Step 1 — Deploy the receiver"). Press Enter to');
  console.log('accept a [default] where shown.\n');

  if (!fs.existsSync(ENV_EXAMPLE_PATH)) {
    throw new Error(`Cannot find .env.example at ${ENV_EXAMPLE_PATH} — the wizard needs it as a template.`);
  }

  const values: Record<string, string> = {};

  for (const key of REQUIRED_KEYS) {
    const meta = FIELD_META[key as string];
    if (!meta) continue;

    if (key === 'webhookReceiverUrl') {
      const deployUrl = renderDeployUrl();
      console.log("\nNo receiver deployed yet? The fastest way to get one:");
      if (deployUrl) {
        console.log(`  ${deployUrl}`);
      } else {
        console.log('  Push this repo to GitHub, then open render.yaml for the one-click deploy link.');
      }
      console.log('Click it, wait ~1 minute, then copy the resulting URL + the auto-generated');
      console.log('BASIC_AUTH_USER/PASS from that service\'s "Environment" tab for the next 3 prompts.\n');
    }

    const suffix = meta.default ? ` [${meta.default}]` : '';
    const prompt = `${meta.label}${suffix}: `;

    let answer = meta.secret ? await askHidden(rl, prompt) : await askPlain(rl, prompt);
    if (!answer && meta.default) answer = meta.default;
    while (!answer) {
      const retryPrompt = `  Required — ${meta.label}: `;
      answer = meta.secret ? await askHidden(rl, retryPrompt) : await askPlain(rl, retryPrompt);
    }
    values[meta.envVar] = answer;
  }

  const template = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
  let output = template;
  for (const [envVar, value] of Object.entries(values)) {
    const lineRe = new RegExp(`^${envVar}=.*$`, 'm');
    output = lineRe.test(output) ? output.replace(lineRe, `${envVar}=${value}`) : `${output}\n${envVar}=${value}`;
  }

  const targetPath = envFilePath(env);
  fs.writeFileSync(targetPath, output, { mode: 0o600 });
  try {
    fs.chmodSync(targetPath, 0o600); // best-effort on platforms where writeFileSync's mode is honored differently
  } catch {
    // Windows filesystems don't support POSIX permission bits — nothing to do here.
  }

  console.log(`\nSaved ${path.relative(REPO_ROOT, targetPath)}:\n`);
  for (const [envVar, value] of Object.entries(values)) {
    const isSecret = Object.values(FIELD_META).find((m) => m.envVar === envVar)?.secret;
    console.log(`  ${envVar}=${isSecret ? maskTail(value) : value}`);
  }
  console.log(`\nRun "./run.sh validate" any time to confirm these values actually work.\n`);
}
