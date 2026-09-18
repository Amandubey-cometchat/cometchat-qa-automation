/**
 * Bootstraps a new environment: creates the two fixed test users this suite
 * expects (see user.factory.ts — CometChat's default Sample App demo users,
 * cometchat-uid-1/cometchat-uid-2). In practice these already exist on any
 * app created with sample-data seeding on (confirmed live across all four
 * environments here), so this is usually a no-op. Kept as a fallback for
 * the rare app that had seeding declined — safe to re-run; CometChat's
 * Create User endpoint is idempotent-ish in practice (a duplicate uid just
 * 400s, which this script treats as "already exists" and moves on rather
 * than failing).
 *
 * Run: APP_ENV=<name> npx tsx scripts/setup.ts
 * (APP_ENV=prod-* also needs CONFIRM_PROD=yes, same as running tests.)
 */
import { getConfig } from '../src/config/env';
import { createTestUser } from '../src/clients/users.client';
import { QA_USER_1, QA_USER_2 } from '../src/data/factories/user.factory';

(async () => {
  const { appEnv } = getConfig();
  console.log(`Creating test users on ${appEnv}: ${QA_USER_1}, ${QA_USER_2}`);

  for (const uid of [QA_USER_1, QA_USER_2]) {
    try {
      await createTestUser(uid, uid);
      console.log(`  created ${uid}`);
    } catch (err: any) {
      if (String(err.message).includes('400')) {
        console.log(`  ${uid} already exists — skipping`);
      } else {
        throw err;
      }
    }
  }

  console.log('Done.');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
