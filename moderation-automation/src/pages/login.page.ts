import { Locator, Page } from '@playwright/test';
import { HomePage } from './home.page';
import { getConfig } from '../config/env';

/** Sample app login: enter a UID and sign in. */
export class LoginPage {
  readonly container: Locator;
  private readonly uidInput: Locator;
  private readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.container = page.locator('.cometchat-login__container');
    this.uidInput = page.locator('#uid-input');
    this.submitButton = page.locator('.cometchat-login__submit-button');
  }

  async loginAs(uid: string): Promise<HomePage> {
    const home = new HomePage(this.page);

    // Pre-seed the App ID / Region / Auth Key exactly where the sample app's
    // credentials screen saves them (App.tsx getCredentials), instead of typing
    // them into CredentialsPage — typed values are recorded in Playwright
    // traces and screenshots, which would leak the Auth Key.
    // adminHost/clientHost are read by our one-line sample-app patch (see
    // scripts/setup-sample-app.ts) — only set for dedicated deployments.
    const { appId, region, authKey, adminHost = '', clientHost = '' } = getConfig();
    await this.page.addInitScript(
      ([id, reg, key, admin, client]) => {
        localStorage.setItem('appId', id);
        localStorage.setItem('region', reg);
        localStorage.setItem('authKey', key);
        localStorage.setItem('adminHost', admin);
        localStorage.setItem('clientHost', client);
      },
      [appId, region, authKey, adminHost, clientHost]
    );

    await this.page.goto('/');
    await this.uidInput.fill(uid);
    await this.submitButton.click();
    await home.conversations.waitFor({ timeout: 60_000 });

    // A fresh browser context opens the SDK socket before login, leaving it
    // unauthenticated — realtime is silently dead until a reload re-runs init
    // with the session in place (same workaround as CometChat's own e2e suite).
    await this.page.reload();
    await home.conversations.waitFor({ timeout: 60_000 });
    return home;
  }
}
