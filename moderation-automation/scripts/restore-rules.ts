/**
 * Safety net: restores every moderation rule's on/off state from a saved
 * rules JSON (e.g. reports/toggle-run/<runId>/rules-before.json) in case a
 * toggle run was killed before its own cleanup ran.
 *
 * Usage: APP_ENV=prod-us CONFIRM_PROD=yes npx tsx scripts/restore-rules.ts <rules.json>
 */
import fs from 'node:fs';
import { getRule, setRuleEnabled } from '../src/api/rules.api';

(async () => {
  const file = process.argv[2];
  if (!file) throw new Error('Pass the rules JSON to restore from.');
  const saved: { id: string; enabled: boolean }[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const r of saved) {
    const current = (await getRule(r.id)).enabled;
    if (current === r.enabled) {
      console.log(`${r.id}: already ${r.enabled ? 'ON' : 'off'}`);
      continue;
    }
    await setRuleEnabled(r.id, r.enabled);
    console.log(`${r.id}: restored to ${r.enabled ? 'ON' : 'off'}`);
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
