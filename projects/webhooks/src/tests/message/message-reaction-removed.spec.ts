import { test } from '@playwright/test';
import { sendMessage, addReaction, removeReaction } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessageReactionRemoved } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('message_reaction_removed webhook fires with the correct emoji, message and reactor', async () => {
  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('unreact-me') });
  await addReaction(message.id, '🎉', QA_USER_2);
  await resetEvents(); // isolate from the reaction_added event above

  await removeReaction(message.id, '🎉', QA_USER_2);

  const payload = await expectWebhookEvent('message_reaction_removed', matchers.byReactionMessageId(message.id));

  validateMessageReactionRemoved(payload, { messageId: message.id, reaction: '🎉', reactor: QA_USER_2 });
});
