/**
 * Clears the receiver's persisted webhook history AND the last uploaded
 * Test Results snapshot right before a fresh test run starts, so the
 * dashboard reflects only this run instead of showing whatever the
 * previous run left behind for its entire duration (Test Results only
 * normally updates at the *end* of a run, when results upload — without
 * this, it stays stale the whole time a run is in progress). Wired into
 * every npm run test:* script, right after open-dashboard.ts and before
 * playwright test.
 *
 * Deliberately NOT a Playwright globalSetup hook — that would fire on any
 * `npx playwright test <file>` invocation too (e.g. a quick single-test
 * diagnostic run), silently wiping data someone might still want to look
 * at. Scoping this to the npm scripts means only an intentional "run
 * everything fresh" clears it.
 */
import { getConfig } from '../src/config/env';

(async () => {
  const { receiverQueryUrl } = getConfig();
  const targets = ['/webhook/history', '/test-results'];
  await Promise.all(
    targets.map(async (path) => {
      try {
        await fetch(`${receiverQueryUrl}${path}`, { method: 'DELETE' });
        console.log(`Cleared ${path} on ${receiverQueryUrl} for a fresh run.`);
      } catch (err: any) {
        console.warn(`Could not clear ${path} (continuing anyway): ${err.message}`);
      }
    })
  );
})();
