import { test } from '@playwright/test';
import { sendMessage, deleteMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessageDeleted } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('message_deleted webhook fires when a message is deleted', async () => {
  const original = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('delete-me') });

  await deleteMessage(original.id, QA_USER_1);

  const payload = await expectWebhookEvent('message_deleted', matchers.byMessageId(original.id));

  validateMessageDeleted(payload, { id: original.id });
});
