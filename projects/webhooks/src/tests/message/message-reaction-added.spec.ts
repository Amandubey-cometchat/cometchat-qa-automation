import { test } from '@playwright/test';
import { sendMessage, addReaction } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessageReactionAdded } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('message_reaction_added webhook fires with the correct emoji, message and reactor', async () => {
  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('react-me') });

  await addReaction(message.id, '👍', QA_USER_2);

  const payload = await expectWebhookEvent('message_reaction_added', matchers.byReactionMessageId(message.id));

  validateMessageReactionAdded(payload, { messageId: message.id, reaction: '👍', reactor: QA_USER_2 });
});
