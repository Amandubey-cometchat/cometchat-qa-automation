import { test } from '@playwright/test';
import { sendMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateBeforeMessage } from '../../validators/legacy.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

// Only meaningful when this app's webhook config is actually switched to
// Legacy mode in the Dashboard — see scripts/test-legacy.ts, which is the
// only supported way to run this file (it confirms Legacy mode is active
// via a canary check first, and always reverts to Modern afterward).
test('before_message webhook fires synchronously before a message is persisted', async () => {
  const text = uniqueMessageText('legacy-before-message');
  await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const payload = await expectWebhookEvent('before_message', matchers.byLegacyMessageText(text));

  validateBeforeMessage(payload, { sender: QA_USER_1, receiver: QA_USER_2, text });
});
