/**
 * Preflight (Playwright globalSetup — runs after the sample app server is up,
 * before any test): opens the sample app with the target app's App ID, logs a
 * throwaway user in, and confirms the running app is really on that App ID.
 * If any of that fails, no test runs — results can't be trusted otherwise.
 */
import { chromium, FullConfig } from '@playwright/test';
import { getConfig } from './config/env';
import { createUser, deleteUser } from './api/cometchat.api';
import { LoginPage } from './pages/login.page';

export default async function preflight(config: FullConfig): Promise<void> {
  const cfg = getConfig();
  const baseURL = config.projects[0].use.baseURL!;
  console.log(`\n[preflight] Starting sample app for ${cfg.appEnv} (App ID ${cfg.appId}, region ${cfg.region}) at ${baseURL}`);

  const user = { uid: `preflight-${Date.now().toString(36)}`, name: 'Preflight check' };
  await createUser(user);
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ baseURL })).newPage();
  try {
    await new LoginPage(page).loginAs(user.uid);

    const running = await page.evaluate(() => ({
      appId: localStorage.getItem('appId'),
      region: localStorage.getItem('region'),
    }));
    if (running.appId !== cfg.appId || running.region !== cfg.region) {
      throw new Error(`Sample app is running on App ID ${running.appId} (${running.region}), expected ${cfg.appId} (${cfg.region}).`);
    }
    console.log(`[preflight] OK — sample app is running on App ID ${running.appId} (${running.region}); "${user.uid}" logged in. Starting tests.\n`);
  } catch (e) {
    const shot = 'test-results/preflight-failure.png';
    await page.screenshot({ path: shot }).catch(() => undefined);
    throw new Error(`[preflight] Sample app check failed for ${cfg.appEnv} — not running tests. ${(e as Error).message} (screenshot: ${shot})`);
  } finally {
    await browser.close();
    await deleteUser(user.uid).catch(() => undefined);
  }
}
