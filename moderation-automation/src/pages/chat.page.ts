import { expect, Locator, Page, Response } from '@playwright/test';
import { ReportMessageDialog } from './report-message.dialog';

/** What the sample app's SDK got back from CometChat when a message was sent. */
export interface SendResult {
  status: number;
  body: any;
  messageId?: string;
}

/** An open conversation: message list and composer. */
export class ChatPage {
  readonly composer: Locator;
  readonly messageList: Locator;
  private readonly input: Locator;

  constructor(private readonly page: Page) {
    this.composer = page.locator('.cometchat-message-composer').first();
    this.messageList = page.locator('.cometchat-message-list').first();
    this.input = this.composer.locator('[contenteditable="true"]').first();
  }

  /** Resolves with the SDK's POST .../messages response — the real API answer to a send. */
  private sendResponse(): Promise<Response> {
    return this.page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/messages$/.test(new URL(r.url()).pathname),
      { timeout: 30_000 }
    );
  }

  private static async toResult(res: Response): Promise<SendResult> {
    const body = await res.json().catch(async () => ({ raw: await res.text().catch(() => '') }));
    return { status: res.status(), body, messageId: body?.data?.id };
  }

  async sendText(text: string): Promise<SendResult> {
    await this.input.click();
    await this.input.fill(text);
    const [res] = await Promise.all([this.sendResponse(), this.page.keyboard.press('Enter')]);
    return ChatPage.toResult(res);
  }

  /** Attach an image via the composer's attachment menu and send it. */
  sendImage(filePath: string): Promise<SendResult> {
    return this.sendMedia(filePath, [/photo|image/i]);
  }

  /** Attach a video; uses a dedicated "Video" option if the menu has one, else the photo/video picker. */
  sendVideo(filePath: string): Promise<SendResult> {
    return this.sendMedia(filePath, [/video/i, /photo|image/i]);
  }

  private async sendMedia(filePath: string, optionTitles: RegExp[]): Promise<SendResult> {
    await this.composer.locator('.cometchat-message-composer__attachment-button').first().click();
    const options = this.page.locator('.cometchat-message-composer__attachment-option');
    await options.first().waitFor();
    let option = options.first();
    for (const title of optionTitles) {
      const match = options.filter({ has: this.page.locator('.cometchat-message-composer__attachment-option-title', { hasText: title }) });
      if (await match.count()) {
        option = match.first();
        break;
      }
    }
    const chooser = this.page.waitForEvent('filechooser');
    await option.click();
    await (await chooser).setFiles(filePath);

    // Multiple-attachment mode stages the file in a tray first; wait for upload, then send.
    const tray = this.page.locator('.cometchat-message-composer__tray').first();
    if (await tray.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(tray.locator('.cometchat-message-composer__tray-progress')).toHaveCount(0, { timeout: 90_000 });
      const [res] = await Promise.all([
        this.sendResponse(),
        this.page.locator('.cometchat-message-composer__send-button--active').first().click(),
      ]);
      return ChatPage.toResult(res);
    }
    return ChatPage.toResult(await this.sendResponse());
  }

  /** Edits one of the user's own messages through More → Edit; returns the SDK's PUT response. */
  async editMessage(currentText: string, newText: string): Promise<SendResult> {
    const bubble = this.bubble(currentText);
    await bubble.hover();
    await bubble.locator('..').locator('button[aria-label*="More" i]').first().click();
    await this.page.locator('[role="menuitem"]', { hasText: /^\s*Edit\s*$/ }).first().click();
    await this.page.locator('.cometchat-message-composer__edit-preview').waitFor();
    await this.input.click();
    await this.page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await this.page.keyboard.type(newText);
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => r.request().method() === 'PUT' && /\/messages\/[^/]+$/.test(new URL(r.url()).pathname), { timeout: 30_000 }),
      this.page.keyboard.press('Enter'),
    ]);
    return ChatPage.toResult(res);
  }

  /**
   * Number of media (non-text) bubbles in the conversation. A video renders as
   * a thumbnail with a play button, not a <video> element, so "anything that
   * isn't a text bubble" is the reliable signal for both images and videos.
   */
  mediaBubbleCount(): Promise<number> {
    return this.messageList
      .locator('.cometchat-message-bubble')
      .filter({ hasNot: this.page.locator('.cometchat-text-bubble') })
      .count();
  }

  /** The bubble (sent or received) whose text contains `text`. */
  bubble(text: string): Locator {
    return this.messageList.locator('.cometchat-message-bubble', { hasText: text }).last();
  }

  /** Red "Your message was blocked due to moderation policies" notices shown to the sender. */
  blockedNoticeCount(): Promise<number> {
    return this.messageList.getByText(/blocked due to moderation/i).count();
  }

  /** Number of image bubbles currently in the conversation. */
  imageBubbleCount(): Promise<number> {
    return this.messageList.locator('.cometchat-message-bubble').filter({ has: this.page.locator('img[src*="media"], .cometchat-image-bubble, [class*="image-bubble"]') }).count();
  }

  /** Opens the message's "More" menu and picks Report. Only offered on incoming messages. */
  async reportMessage(text: string): Promise<ReportMessageDialog> {
    const bubble = this.bubble(text);
    await bubble.hover();
    await bubble.locator('..').locator('button[aria-label*="More" i]').first().click();
    await this.page.locator('[role="menuitem"]', { hasText: 'Report' }).first().click();
    const dialog = new ReportMessageDialog(this.page);
    await dialog.root.waitFor();
    return dialog;
  }
}
