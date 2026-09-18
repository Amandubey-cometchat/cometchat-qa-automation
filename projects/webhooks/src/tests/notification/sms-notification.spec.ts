import { test } from '@playwright/test';
import { sendMessage } from '../../triggers/notification/notification.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateSmsNotificationGenerated } from '../../validators/notification.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { NOTIFICATION_TIMEOUT_MS, NOTIFICATION_TEST_TIMEOUT_MS } from '../../utils/timeout';

// Must exceed NOTIFICATION_TIMEOUT_MS — playwright.config.ts's global 30s
// timeout would otherwise kill the wait early and report a misleading
// "Test timeout" instead of a real "webhook never arrived" failure.
test.setTimeout(NOTIFICATION_TEST_TIMEOUT_MS);

test.beforeEach(async () => {
  await resetEvents();
});

// Only meaningful once Dashboard -> Settings -> Notifications -> Providers
// -> Custom SMS Provider is enabled with this environment's receiver URL
// (+ matching Basic Auth) entered as its webhook — see README
// "Notifications". No "trigger only if stored" toggle for SMS per the
// Dashboard UI, so this should fire regardless of the QA users having no
// real phone number on file.
test('sms-notification-payload-generated webhook fires', async () => {
  const text = uniqueMessageText('sms-notification-check');
  await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const payload = await expectWebhookEvent('sms-notification-payload-generated', matchers.byNotificationRecipientUid(QA_USER_2), NOTIFICATION_TIMEOUT_MS);

  validateSmsNotificationGenerated(payload, { recipientUid: QA_USER_2, senderUid: QA_USER_1 });
});
