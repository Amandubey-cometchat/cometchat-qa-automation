import { test, expect } from '../../fixtures/test';
import { listBlockedMessages } from '../../api/cometchat.api';

test('a clean message is delivered and not blocked by moderation', async ({ alice, bob, runId }) => {
  const text = `ordinary moderation-clean message ${runId}`;

  const aliceChat = await alice.home.openUserChat(bob.user.name);
  const bobChat = await bob.home.openUserChat(alice.user.name);

  await aliceChat.sendText(text);

  await expect(aliceChat.bubble(text), 'sender sees their own message').toBeVisible();
  await expect(bobChat.bubble(text), 'receiver gets the message in real time').toBeVisible();

  const blocked = await listBlockedMessages();
  expect(blocked.filter((b) => b.message.data?.text === text), 'clean message must not be in the blocked list').toHaveLength(0);
});
