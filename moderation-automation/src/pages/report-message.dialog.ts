import { Locator, Page } from '@playwright/test';

/** UI Kit's CometChatFlagMessageDialog — shown as "Report" in the message menu. */
export class ReportMessageDialog {
  readonly root: Locator;
  readonly error: Locator;
  private readonly remarkInput: Locator;
  private readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('.cometchat-flag-message-dialog[role="dialog"]');
    this.error = page.locator('.cometchat-flag-message-dialog__error');
    this.remarkInput = this.root.locator('.cometchat-flag-message-dialog__remark-input');
    this.submitButton = this.root.locator('.cometchat-flag-message-dialog__actions-submit button');
  }

  /**
   * Reason whose UI label starts with `label`. The label for the same reason
   * varies — the `spam` reason has shown as both "Spam" and
   * "Spam / Unwanted Content" — so match on the start of the name.
   */
  reason(label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.root.getByRole('radio', { name: new RegExp(`^${escaped}`) });
  }

  async submit(reasonLabel: string, remark?: string): Promise<void> {
    await this.reason(reasonLabel).click();
    if (remark) await this.remarkInput.fill(remark);

    // On failure the UI only says "Looks like something went wrong" — surface
    // the server's actual answer so a failing test explains itself.
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => /\/messages\/[^/]+\/flagged$/.test(new URL(r.url()).pathname)),
      this.submitButton.click(),
    ]);
    if (!response.ok()) {
      const body = await response.text().catch(() => '');
      throw new Error(`Report was rejected by CometChat: HTTP ${response.status()} ${body.slice(0, 500)}`);
    }
    await this.root.waitFor({ state: 'hidden' });
  }
}
