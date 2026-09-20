/**
 * Every test gets two fresh users — alice (sender) and bob (receiver) — each
 * signed into the sample app in their own browser context, so both sides of
 * a conversation are checked through the real UI. Users are created and
 * permanently deleted via REST around each test; unique IDs keep runs from
 * seeing each other's messages in the app's Moderation lists.
 */
import { test as base, expect, Page } from '@playwright/test';
import { createUser, deleteUser, TestUser } from '../api/cometchat.api';
import { LoginPage } from '../pages/login.page';
import { HomePage } from '../pages/home.page';

export interface Actor {
  user: TestUser;
  page: Page;
  home: HomePage;
}

interface Fixtures {
  runId: string;
  alice: Actor;
  bob: Actor;
}

function newUser(runId: string, role: string): TestUser {
  return { uid: `mod-${runId}-${role}`, name: `Mod ${role} ${runId}` };
}

export const test = base.extend<Fixtures>({
  runId: async ({}, use) => {
    await use(`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`);
  },

  alice: async ({ browser, runId }, use) => {
    const user = newUser(runId, 'alice');
    await createUser(user);
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const home = await new LoginPage(page).loginAs(user.uid);
      await use({ user, page, home });
    } finally {
      await context.close();
      await deleteUser(user.uid).catch(() => undefined);
    }
  },

  bob: async ({ browser, runId }, use) => {
    const user = newUser(runId, 'bob');
    await createUser(user);
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const home = await new LoginPage(page).loginAs(user.uid);
      await use({ user, page, home });
    } finally {
      await context.close();
      await deleteUser(user.uid).catch(() => undefined);
    }
  },
});

export { expect };

/** How long to watch the receiver's screen before concluding a message was never delivered. */
export const NOT_DELIVERED_WINDOW_MS = 10_000;
