/**
 * Drives the real CometChat Sample App (sample-app/sample-app/ — CometChat's
 * own official React UI Kit demo, cloned from
 * github.com/cometchat/cometchat-sample-app-react) via Playwright. A
 * genuinely different kind of trigger than everything else in this
 * project: instead of a REST call or a raw SDK method call, this is a real
 * browser clicking through a real chat UI — typing into the message
 * composer, hitting Send — the same way an actual end user would.
 *
 * Login flow and selectors are not guessed: they're taken directly from
 * CometChat's own official E2E test suite for this app
 * (sample-app/sample-app/e2e/helpers/auth.ts,
 * e2e/message-composer/message-composer.spec.ts), which ships in the same
 * repo. Runs non-headless by design — the whole point is to be able to
 * watch it happen, unlike the rest of this project's REST/SDK triggers.
 *
 * Requires the sample app's dev server running separately:
 *   cd sample-app/sample-app && npm run dev
 * And COMETCHAT_AUTH_KEY set in .env.<APP_ENV> — a client-side credential,
 * different from COMETCHAT_REST_API_KEY, never sent to the REST API.
 */
import { chromium, Browser, Page } from '@playwright/test';
import { getConfig } from '../config/env';

const SAMPLE_APP_URL = process.env.SAMPLE_APP_URL || 'http://localhost:3006';

export interface SampleAppSession {
  browser: Browser;
  page: Page;
  close(): Promise<void>;
}

/** Logs into the running sample app as `uid`, handling the credentials screen (App ID/Auth Key/Region) if shown, then the login screen. */
export async function loginToSampleApp(uid: string): Promise<SampleAppSession> {
  const { appId, authKey, region } = getConfig();
  if (!authKey) {
    throw new Error('COMETCHAT_AUTH_KEY is not set for this environment — required for sample-app.client.ts. See .env.example.');
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(SAMPLE_APP_URL);
  await page.waitForSelector('.cometchat-credentials__form, .cometchat-login__container, .cometchat-conversations', { timeout: 30_000 });

  const isHome = await page.locator('.cometchat-conversations').isVisible().catch(() => false);
  if (!isHome) {
    const isCredentials = await page.locator('.cometchat-credentials__form').isVisible().catch(() => false);
    if (isCredentials) {
      const regionEl = page.locator(`.cometchat-credentials__region-text:has-text("${region.toUpperCase()}")`).first();
      if (await regionEl.isVisible().catch(() => false)) await regionEl.click();
      await page.locator('#appId-input').fill(appId);
      await page.locator('#authKey-input').fill(authKey);
      await page.locator('.cometchat-credentials__button').click();
      await page.waitForSelector('.cometchat-login__container', { timeout: 30_000 });
    }

    await page.locator('#uid-input').fill(uid);
    await page.locator('.cometchat-login__submit-button').click();
    await page.waitForSelector('.cometchat-conversations', { timeout: 60_000 });
  }

  return {
    browser,
    page,
    async close() {
      await browser.close();
    },
  };
}

/** Opens a 1:1 chat with `targetUid` via the Users tab — works whether or not a conversation already exists, unlike the Conversations tab. */
export async function openUserChat(page: Page, targetUid: string): Promise<void> {
  const usersTab = page.locator('.cometchat-tab-component__tab:has-text("Users")').first();
  await usersTab.click();
  await page.waitForSelector('.cometchat-users__item', { timeout: 30_000 });

  const target = page.locator('.cometchat-users__item').filter({ hasText: targetUid }).first();
  await target.waitFor({ state: 'visible', timeout: 5_000 });
  await target.click();

  await page.waitForSelector('.cometchat-message-list', { timeout: 15_000 });
}

/** Types `text` into the message composer and sends it via the real Send button. */
export async function sendComposerMessage(page: Page, text: string): Promise<void> {
  const composer = page.locator('.cometchat-message-composer').first();
  const input = composer.locator('[contenteditable="true"]').first();
  await input.click();
  await page.keyboard.type(text);
  await page.waitForTimeout(300);

  const sendBtn = page.locator('.cometchat-message-composer__send-button--active').first();
  await sendBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await sendBtn.click();
}
