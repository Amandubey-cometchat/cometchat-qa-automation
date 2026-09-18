/**
 * Runs the Legacy webhook test suite — the one part of this project that
 * needs a real, manual Dashboard toggle first. Legacy and Modern webhooks
 * are mutually exclusive per app (confirmed live via the Dashboard's own
 * webhook forms), and there is no REST/Management API to switch between
 * them (confirmed 2026-09-09 — searched CometChat's entire Webhooks
 * Management API reference, zero mentions of "legacy"). That manual step
 * can't be removed, only made safe to live with:
 *
 *   1. Prints exact instructions to switch the target app to Legacy mode,
 *      and waits for your explicit confirmation before doing anything.
 *   2. Runs a "canary" check — sends one real message and confirms a
 *      Legacy-only trigger (not a Modern one) actually arrives — before
 *      running the real suite. Refuses to proceed if the toggle didn't
 *      actually take, instead of running the whole suite against a broken
 *      config and producing a wall of confusing timeouts.
 *   3. Runs the real Legacy spec files.
 *   4. ALWAYS (pass, fail, or crash) prints revert instructions and waits
 *      for confirmation, then runs the canary check in reverse — proving
 *      Modern mode is genuinely restored — before exiting. If the revert
 *      didn't take, this fails LOUDLY here rather than silently breaking
 *      the rest of the automated suite on their next run.
 *
 * Run: APP_ENV=<name> npx tsx scripts/test-legacy.ts
 * (APP_ENV=prod-* also needs CONFIRM_PROD=yes, same as every other script.)
 */
import * as readline from 'readline';
import { execSync } from 'child_process';
import { getConfig } from '../src/config/env';
import { sendMessage } from '../src/triggers/message/message.triggers';
import { resetEvents, fetchEvents } from '../src/webhook/webhook.listener';
import { QA_USER_1, QA_USER_2 } from '../src/data/factories/user.factory';
import { uniqueMessageText } from '../src/data/factories/message.factory';

const MODERN_SIGNAL = 'message_sent';
const LEGACY_SIGNALS = ['after_message', 'before_message'];
const CANARY_TIMEOUT_MS = 15000;

// One shared interface for the whole script, not one per prompt — creating
// a fresh readline.Interface per call is a known source of hangs on the
// second+ prompt (the previous interface's rl.close() can leave stdin in a
// state the next createInterface() doesn't cleanly reattach to). Closed
// once, at the very end.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer)));
}

async function waitForAnyTrigger(triggers: string[], timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await fetchEvents();
    const found = events.find((e) => triggers.includes(e.trigger));
    if (found) return found.trigger;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

/** Sends one real message and confirms which webhook world is actually active — never assumes the Dashboard toggle took effect. */
async function canaryCheck(expectMode: 'legacy' | 'modern'): Promise<boolean> {
  await resetEvents();
  console.log(`\nSending a canary message to confirm ${expectMode.toUpperCase()} mode is active...`);
  await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('legacy-canary') });

  const arrived = await waitForAnyTrigger([MODERN_SIGNAL, ...LEGACY_SIGNALS], CANARY_TIMEOUT_MS);
  if (!arrived) {
    console.error(
      `\n[FAIL] No webhook arrived at all (neither "${MODERN_SIGNAL}" nor a Legacy trigger) within ${CANARY_TIMEOUT_MS}ms.\n` +
        'Check the receiver URL/auth/trigger checkboxes in the Dashboard.'
    );
    return false;
  }

  const isLegacy = LEGACY_SIGNALS.includes(arrived);
  if (expectMode === 'legacy' && isLegacy) {
    console.log(`[OK] Confirmed: Legacy mode is active (saw "${arrived}").`);
    return true;
  }
  if (expectMode === 'modern' && arrived === MODERN_SIGNAL) {
    console.log(`[OK] Confirmed: Modern mode is active (saw "${arrived}").`);
    return true;
  }
  console.error(`\n[FAIL] Expected ${expectMode.toUpperCase()} mode but saw "${arrived}" instead — the Dashboard toggle may not have taken effect.`);
  return false;
}

(async () => {
  try {
    const { appEnv, receiverQueryUrl } = getConfig();
    console.log('\n========================================');
    console.log(`LEGACY WEBHOOK TEST RUN: ${appEnv}`);
    console.log('========================================');

    // Same opening steps every other test:* script does — open the
    // receiver's dashboard so events can be watched live, and clear its
    // history/last-results so this run starts from a clean view.
    execSync('npx tsx scripts/open-dashboard.ts', { stdio: 'inherit' });
    execSync('npx tsx scripts/clear-history.ts', { stdio: 'inherit' });

    console.log('\nStep 1 — switch this app to LEGACY webhook mode in the CometChat Dashboard:');
    console.log('  1. Go to the Legacy Webhooks section for this app');
    console.log(`  2. Webhook URL must end in /webhook (i.e. ${receiverQueryUrl}/webhook) — the bare receiver URL 404s`);
    console.log('  3. Check these triggers: after_message, before_message, message_delivery_receipt, message_read_receipt, after_connection_status_changed');
    console.log('  4. "Enable Webhook" must be checked, then Save');
    console.log('\n  This DISABLES the modern webhook config the rest of the automated suite depend on.');
    await ask('\nPress Enter once Legacy mode is active and saved... ');

    const legacyConfirmed = await canaryCheck('legacy');
    if (!legacyConfirmed) {
      console.error('\nAborting — refusing to run the Legacy suite against an unconfirmed config.');
      process.exitCode = 1;
      return;
    }

    console.log('\nRunning the Legacy test suite...\n');
    let testsFailed = false;
    try {
      // RUN_LEGACY=1 lifts playwright.config.ts's default exclusion of real
      // (non-gap) Legacy spec files — see that file's comment for why they
      // don't run in the regular suite.
      execSync('npx playwright test src/tests/legacy/', { stdio: 'inherit', env: { ...process.env, RUN_LEGACY: '1', LIVE_RESULTS: '1' } });
    } catch {
      testsFailed = true;
    }

    // Same closing steps every other test:* script does — push results to
    // the dashboard's Test Results tab and regenerate the coverage report,
    // regardless of pass/fail.
    try {
      execSync('npx tsx scripts/upload-test-results.ts', { stdio: 'inherit' });
      execSync('npx tsx scripts/generate-coverage.ts', { stdio: 'inherit' });
    } catch (err: any) {
      console.warn(`\nCould not upload results / regenerate coverage: ${err.message}`);
    }

    // Always attempt the revert, even if the run above crashed or failed —
    // leaving the app stuck in Legacy mode is the one truly dangerous
    // outcome here, worse than any individual test failure.
    console.log('\nStep 2 — switch this app BACK to MODERN webhook mode in the Dashboard.');
    await ask('Press Enter once Modern mode is restored and saved... ');

    const modernRestored = await canaryCheck('modern');
    if (!modernRestored) {
      console.error(
        '\n[WARNING] Modern mode does not appear to be restored. The rest of the automated suite will fail until ' +
          'this is fixed — re-check the Dashboard before running anything else against this app.'
      );
      process.exitCode = 1;
      return;
    }

    console.log('\n[DONE] Legacy test run complete, and Modern mode is confirmed restored.');
    process.exitCode = testsFailed ? 1 : 0;
  } finally {
    rl.close();
  }
})();
