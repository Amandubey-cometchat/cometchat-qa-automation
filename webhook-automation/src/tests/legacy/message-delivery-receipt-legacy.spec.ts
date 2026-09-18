import { test } from '@playwright/test';
import { sendMessage, markDelivered } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateLegacyReceipt } from '../../validators/legacy.validator';
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

// Only meaningful when this app's webhook config is actually switched to
// Legacy mode in the Dashboard — see scripts/test-legacy.ts. Shares its
// trigger name with the modern message_delivery_receipt webhook, but the
// payload shape is structurally different — see validateLegacyReceipt.
test('message_delivery_receipt (legacy) webhook fires', async () => {
  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('legacy-delivery-receipt') });

  await resetEvents();
  const { client } = await markDelivered(QA_USER_2, message.id, QA_USER_1, 'user', QA_USER_1);
  registerCleanup(() => client.close());

  const payload = await expectWebhookEvent('message_delivery_receipt', matchers.byLegacyReceiptMessageId(message.id), RECEIPT_TIMEOUT_MS);

  validateLegacyReceipt(payload, { trigger: 'message_delivery_receipt', receiptType: 'delivered', messageId: message.id, sender: QA_USER_1, recipient: QA_USER_2 });
});
