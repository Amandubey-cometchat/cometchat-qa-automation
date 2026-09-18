/**
 * Opens the current environment's receiver dashboard in the default browser
 * right before a test run starts, so events can be watched landing live
 * (the dashboard already polls /webhook/history every 1.5s on its own).
 * Wired into every npm run test:* script, right before `playwright test`.
 *
 * Deliberately doesn't fail the run if the browser can't be opened (e.g. a
 * headless CI machine) — this is a local-dev convenience, not something
 * that should ever block or fail a test run.
 */
import { exec } from 'child_process';
import { getConfig } from '../src/config/env';

const { receiverQueryUrl, appEnv } = getConfig();
const dashboardUrl = `${receiverQueryUrl}/dashboard`;

const openCommand =
  process.platform === 'darwin' ? `open "${dashboardUrl}"` : process.platform === 'win32' ? `start "" "${dashboardUrl}"` : `xdg-open "${dashboardUrl}"`;

console.log(`Opening ${appEnv} dashboard: ${dashboardUrl}`);
exec(openCommand, (err) => {
  if (err) {
    console.warn(`Could not auto-open the dashboard (${err.message}) — open it manually: ${dashboardUrl}`);
  }
});
