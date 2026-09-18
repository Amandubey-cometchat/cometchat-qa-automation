import { test } from '@playwright/test';
import { sendMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessageSent } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('message_sent webhook fires when a text message is sent', async () => {
  const text = uniqueMessageText('automated test message');

  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, receiverType: 'user', text });

  const payload = await expectWebhookEvent('message_sent', matchers.byMessageId(message.id));

  validateMessageSent(payload, { id: message.id, sender: QA_USER_1, receiver: QA_USER_2, receiverType: 'user', text });
});
