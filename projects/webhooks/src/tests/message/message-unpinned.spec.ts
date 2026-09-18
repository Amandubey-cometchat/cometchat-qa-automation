import { test } from '@playwright/test';
import { sendMessage, pinMessage, unpinMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessageUnpinned } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('message_unpinned webhook fires when a message is unpinned', async () => {
  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('unpin-me') });
  await pinMessage(message.id, QA_USER_1);

  await unpinMessage(message.id, QA_USER_1);

  const payload = await expectWebhookEvent('message_unpinned', matchers.byMessageId(message.id));

  validateMessageUnpinned(payload, { id: message.id, unpinnedBy: QA_USER_1 });
});
