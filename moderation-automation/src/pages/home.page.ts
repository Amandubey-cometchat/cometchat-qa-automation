import { expect, Locator, Page } from '@playwright/test';
import { ChatPage } from './chat.page';

/** Signed-in home screen: conversation list plus Users / Groups tabs. */
export class HomePage {
  readonly conversations: Locator;

  constructor(private readonly page: Page) {
    this.conversations = page.locator('.cometchat-conversations');
  }

  private tab(name: 'Chats' | 'Calls' | 'Users' | 'Groups'): Locator {
    return this.page.locator('.cometchat-tab-component__tab', { hasText: name }).first();
  }

  /**
   * Opens a 1-on-1 chat by searching the Users tab (the list is paginated, so
   * search rather than scroll). `name` must be unique — the list re-renders
   * while the debounced search runs, so we wait for it to settle on exactly
   * one result before clicking.
   */
  async openUserChat(name: string): Promise<ChatPage> {
    // Right after login the tab bar can swallow a click before the app is
    // ready — retry until the Users panel is actually showing.
    const usersPanel = this.page.locator('.cometchat-users');
    await expect(async () => {
      await this.tab('Users').click();
      await expect(usersPanel).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });

    const items = this.page.locator('.cometchat-users__item');
    await this.searchUntilSingle(usersPanel.getByRole('searchbox'), items, name);
    await items.filter({ hasText: name }).click();
    const chat = new ChatPage(this.page);
    await chat.composer.waitFor({ timeout: 15_000 });
    return chat;
  }

  /** Opens a group chat by searching the Groups tab. `name` must be unique. */
  async openGroupChat(name: string): Promise<ChatPage> {
    const groupsPanel = this.page.locator('.cometchat-groups');
    await expect(async () => {
      await this.tab('Groups').click();
      await expect(groupsPanel).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    const items = this.page.locator('.cometchat-groups__item');
    await this.searchUntilSingle(groupsPanel.getByRole('searchbox'), items, name);
    await items.filter({ hasText: name }).click();
    const chat = new ChatPage(this.page);
    await chat.composer.waitFor({ timeout: 15_000 });
    return chat;
  }

  /**
   * Types into a list's search box until the list shows exactly the one match.
   * Right after login the list's first (unfiltered) load can land after the
   * search results and overwrite them, so a single fill isn't reliable.
   */
  private async searchUntilSingle(search: Locator, items: Locator, name: string): Promise<void> {
    await expect(async () => {
      await search.fill('');
      await search.fill(name);
      await expect(items).toHaveCount(1, { timeout: 5_000 });
      await expect(items.first()).toContainText(name);
    }, `search for "${name}" should settle on exactly that one result`).toPass({ timeout: 45_000 });
  }
}
