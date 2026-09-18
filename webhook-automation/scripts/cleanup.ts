/**
 * Sweeps up stray "qa-" prefixed groups left behind by a failed or
 * interrupted test run (normal runs already clean up after themselves via
 * src/utils/cleanup.ts's per-test registry — this is the manual safety net
 * for when that didn't happen, e.g. a crashed process).
 *
 * Run: APP_ENV=<name> npx tsx scripts/cleanup.ts
 * (APP_ENV=prod-* also needs CONFIRM_PROD=yes, same as running tests —
 * this deletes real groups on whatever app it targets.)
 */
import { getConfig } from '../src/config/env';
import { searchGroups, deleteGroup } from '../src/clients/groups.client';

(async () => {
  const { appEnv } = getConfig();
  console.log(`Sweeping stray "qa-" groups on ${appEnv}...`);

  const result = await searchGroups('qa-');
  const groups: any[] = (result as any)?.groups || result || [];
  const strays = groups.filter((g: any) => typeof g.guid === 'string' && g.guid.startsWith('qa-'));

  if (strays.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  console.log(`Found ${strays.length} stray group(s):`);
  for (const g of strays) {
    try {
      await deleteGroup(g.guid);
      console.log(`  deleted ${g.guid}`);
    } catch (err: any) {
      console.log(`  failed to delete ${g.guid}: ${err.message}`);
    }
  }

  console.log('Done.');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
