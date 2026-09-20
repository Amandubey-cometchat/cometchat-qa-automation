import { test, expect, NOT_DELIVERED_WINDOW_MS } from '../../fixtures/test';
import { isRuleEnabled, listBlockedMessages } from '../../api/cometchat.api';

/**
 * Each case is one of the app's default text rules. A case only runs when
 * its rule is enabled in the app under test — otherwise it's skipped with the
 * reason, never passed or failed for the wrong reason.
 */
const CASES = [
  { ruleId: 'profanity-filter', label: 'profanity', text: (id: string) => `damn ${id}` },
  { ruleId: 'contact_details_filter', label: 'a phone number', text: (id: string) => `call me on 9876543210 ${id}` },
  { ruleId: 'email_filter', label: 'an email address', text: (id: string) => `mail me at qa.${id}@example.com` },
];

for (const c of CASES) {
  test(`a message containing ${c.label} is blocked by ${c.ruleId}`, async ({ alice, bob, runId }) => {
    test.skip(!(await isRuleEnabled(c.ruleId)), `${c.ruleId} is disabled in this app (Dashboard → Moderation → Rules)`);

    const text = c.text(runId);
    const aliceChat = await alice.home.openUserChat(bob.user.name);
    const bobChat = await bob.home.openUserChat(alice.user.name);

    await aliceChat.sendText(text);

    // Recorded in the app's Blocked Messages list under the expected rule.
    await expect
      .poll(async () => (await listBlockedMessages()).filter((b) => b.message.data?.text === text), {
        message: `message should appear in Blocked Messages under ${c.ruleId}`,
        timeout: 30_000,
      })
      .toEqual([
        expect.objectContaining({
          ruleId: c.ruleId,
          message: expect.objectContaining({ sender: alice.user.uid, receiver: bob.user.uid }),
        }),
      ]);

    // Never reaches the receiver. A clean follow-up that DOES arrive proves
    // bob's chat is live — otherwise "not visible" could just mean realtime died.
    const followUp = `clean follow-up ${runId}`;
    await aliceChat.sendText(followUp);
    await expect(bobChat.bubble(followUp), 'receiver chat is live (clean follow-up arrives)').toBeVisible();
    await bob.page.waitForTimeout(NOT_DELIVERED_WINDOW_MS);
    await expect(bobChat.bubble(text), 'blocked message must not be delivered').toHaveCount(0);
  });
}
