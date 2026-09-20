import { test, expect } from '../../fixtures/test';
import { listFlaggedMessages } from '../../api/cometchat.api';

test('reporting a message through the UI puts it in Flagged Messages with the reason and remark', async ({ alice, bob, runId }) => {
  const text = `please review this message ${runId}`;
  const remark = `reported by automation ${runId}`;

  const aliceChat = await alice.home.openUserChat(bob.user.name);
  const bobChat = await bob.home.openUserChat(alice.user.name);

  await aliceChat.sendText(text);
  await expect(bobChat.bubble(text)).toBeVisible();

  const dialog = await bobChat.reportMessage(text);
  await dialog.submit('Spam', remark);
  await expect(dialog.error, 'no error shown after submitting the report').toBeHidden();

  await expect
    .poll(async () => (await listFlaggedMessages()).filter((m) => m.data?.text === text), {
      message: 'message should appear in Flagged Messages',
      timeout: 30_000,
    })
    .toEqual([
      expect.objectContaining({
        sender: alice.user.uid,
        receiver: bob.user.uid,
        flaggedCount: 1,
        flaggedBy: [expect.objectContaining({ uid: bob.user.uid, reasonId: 'spam', remark })],
      }),
    ]);

  // Flagged messages stay visible until a moderator acts on them.
  await expect(bobChat.bubble(text), 'flagged message stays visible to the receiver').toBeVisible();
  await expect(aliceChat.bubble(text), 'flagged message stays visible to the sender').toBeVisible();
});
