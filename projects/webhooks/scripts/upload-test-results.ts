/**
 * Uploads the just-generated reports/json/results.json to the receiver's
 * POST /test-results, so the dashboard's Test Results tab reflects reality
 * even when the receiver runs somewhere other than this machine (e.g.
 * deployed on Render while tests run from a laptop) — it can't read a file
 * off a filesystem it doesn't share.
 *
 * Run automatically after `npm run test:webhooks` (see package.json). Safe
 * to run manually too: `npx tsx scripts/upload-test-results.ts`.
 */
import fs from 'fs';
import path from 'path';
import { getConfig } from '../src/config/env';

const RESULTS_FILE = path.join(__dirname, '..', 'reports', 'json', 'results.json');

(async () => {
  const { receiverQueryUrl, webhookBasicAuthUser, webhookBasicAuthPass } = getConfig();

  let report: string;
  try {
    report = fs.readFileSync(RESULTS_FILE, 'utf-8');
  } catch (err: any) {
    console.error(`No results file at ${RESULTS_FILE} — did the test run generate one? (${err.message})`);
    process.exit(1);
    return;
  }

  const res = await fetch(`${receiverQueryUrl}/test-results`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${webhookBasicAuthUser}:${webhookBasicAuthPass}`).toString('base64'),
    },
    body: report,
  });

  if (!res.ok) {
    console.error(`Upload failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  console.log(`Test results uploaded to ${receiverQueryUrl}/dashboard`);
})();
