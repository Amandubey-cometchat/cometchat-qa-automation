/**
 * Configuration + connectivity validation. Reachable via `npm run validate`,
 * `./run.sh validate`, or the CLI menu. Reuses getConfig() (its own clear
 * "missing: x, y, z" error text is surfaced verbatim, never re-derived
 * here), the receiver's existing GET /health endpoint, and
 * cometchat.client.ts's existing apiRequest — no new validation logic.
 *
 * src/config/env.ts fail-fast-loads config at import time, which would
 * otherwise crash this script with a raw stack trace instead of a clean
 * report on exactly the case this command exists to diagnose. A *dynamic*
 * import lets that throw be caught like any other rejected promise — but
 * only if EVERY module that transitively reaches env.ts is also imported
 * dynamically, deferred until inside the try block below. A static
 * top-level `import ... from '../src/clients/cometchat.client'` here would
 * defeat this: cometchat.client.ts itself statically imports env.ts, so
 * just having that import line at the top of this file would trigger the
 * same fail-fast crash before main() even runs, bypassing the try/catch
 * entirely. (Found this the hard way — see verification notes.)
 */
type ApiRequestFn = typeof import('../src/clients/cometchat.client').apiRequest;

async function main(): Promise<void> {
  console.log('Configuration Validation\n');

  const targetEnv = process.env.APP_ENV || 'staging-us';
  let config: Awaited<ReturnType<typeof import('../src/config/env').getConfig>>;
  let apiRequest: ApiRequestFn;

  try {
    const envModule = await import('../src/config/env');
    config = envModule.getConfig();
    apiRequest = (await import('../src/clients/cometchat.client')).apiRequest;
  } catch (err: any) {
    console.log(`✗ Configuration invalid for APP_ENV="${targetEnv}"\n`);
    console.log(err.message);
    console.log(`\nRun the setup wizard (select "Configure an environment" from the menu, or delete/edit .env.${targetEnv} and re-run) to fix this.`);
    process.exitCode = 1;
    return;
  }

  console.log(`✓ Environment (${config.appEnv})`);
  console.log(`✓ App ID (${config.appId})`);
  console.log(`✓ Region (${config.region})`);
  console.log(`✓ Webhook Basic Auth values present (not live-checked — no read-only authenticated endpoint to test against without writing a fake event)`);

  let allOk = true;

  try {
    const res = await fetch(`${config.receiverQueryUrl}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    console.log(`✓ Webhook receiver reachable (${config.receiverQueryUrl}) — ${body.historyEvents ?? 0} events in its history`);
  } catch (err: any) {
    allOk = false;
    console.log(`✗ Webhook receiver unreachable (${config.receiverQueryUrl})`);
    console.log(`  ${err.message}`);
    console.log('  Possible reasons: the receiver isn\'t deployed, WEBHOOK_RECEIVER_URL/RECEIVER_QUERY_URL is wrong,');
    console.log('  or it\'s a free-tier host (e.g. Render) that has spun down and needs a moment to wake up.');
  }

  try {
    await apiRequest('GET', '/users?limit=1');
    console.log('✓ CometChat REST API credentials valid');
  } catch (err: any) {
    allOk = false;
    console.log('✗ CometChat REST API credentials invalid, or the app/region is wrong');
    console.log(`  ${err.message}`);
  }

  console.log('');
  if (allOk) {
    console.log('Configuration is valid.');
  } else {
    console.log('Configuration has problems — see the ✗ lines above for what to fix.');
  }
  process.exitCode = allOk ? 0 : 1;
}

main();
