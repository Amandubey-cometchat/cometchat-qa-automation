import { test } from '@playwright/test';
import { sendMessage, markRead } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateReceipt } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { RECEIPT_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('message_read_receipt webhook fires when a recipient client marks a message read', async () => {
  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('read-receipt-check') });

  await resetEvents();
  const { client } = await markRead(QA_USER_2, message.id, QA_USER_1, 'user', QA_USER_1);
  registerCleanup(() => client.close());

  const payload = await expectWebhookEvent('message_read_receipt', matchers.byReceiptMessageId(message.id), RECEIPT_TIMEOUT_MS);

  validateReceipt(payload, { trigger: 'message_read_receipt', action: 'read', messageId: message.id, recipient: QA_USER_2, sender: QA_USER_1 });
});
