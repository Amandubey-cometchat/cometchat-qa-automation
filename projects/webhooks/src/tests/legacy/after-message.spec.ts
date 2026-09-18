import { test } from '@playwright/test';
import { sendMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateAfterMessage } from '../../validators/legacy.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

// Only meaningful when this app's webhook config is actually switched to
// Legacy mode in the Dashboard — see scripts/test-legacy.ts, which is the
// only supported way to run this file (it confirms Legacy mode is active
// via a canary check first, and always reverts to Modern afterward).
test('after_message webhook fires', async () => {
  const text = uniqueMessageText('legacy-after-message');
  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const payload = await expectWebhookEvent('after_message', matchers.byLegacyMessageId(message.id));

  validateAfterMessage(payload, { id: message.id, sender: QA_USER_1, receiver: QA_USER_2, text });
});
