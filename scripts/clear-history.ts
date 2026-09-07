/**
 * Clears the receiver's persisted webhook history right before a fresh test
 * run starts, so the dashboard reflects only this run's events instead of
 * accumulating everything since the receiver was deployed. Wired into every
 * npm run test:* script, right after open-dashboard.ts and before
 * playwright test.
 *
 * Deliberately NOT a Playwright globalSetup hook — that would fire on any
 * `npx playwright test <file>` invocation too (e.g. a quick single-test
 * diagnostic run), silently wiping history someone might still want to look
 * at. Scoping this to the npm scripts means only an intentional "run
 * everything fresh" clears it.
 */
import { getConfig } from '../src/config/env';

(async () => {
  const { receiverQueryUrl } = getConfig();
  try {
    await fetch(`${receiverQueryUrl}/webhook/history`, { method: 'DELETE' });
    console.log(`Cleared webhook history on ${receiverQueryUrl} for a fresh run.`);
  } catch (err: any) {
    console.warn(`Could not clear webhook history (continuing anyway): ${err.message}`);
  }
})();
