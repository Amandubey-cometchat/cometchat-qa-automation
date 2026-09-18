import { test } from '@playwright/test';
import { sendMessage } from '../../triggers/notification/notification.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateEmailNotificationGenerated } from '../../validators/notification.validator';
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
// -> Custom Email Provider is enabled with this environment's receiver URL
// (+ matching Basic Auth) entered as its webhook — see README
// "Notifications". Leave "Trigger only if email address is stored" OFF so
// this fires for the fixed QA sample users, who have no real email on file.
test('email-notification-payload-generated webhook fires', async () => {
  const text = uniqueMessageText('email-notification-check');
  await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const payload = await expectWebhookEvent('email-notification-payload-generated', matchers.byNotificationRecipientUid(QA_USER_2), NOTIFICATION_TIMEOUT_MS);

  validateEmailNotificationGenerated(payload, { recipientUid: QA_USER_2, senderUid: QA_USER_1 });
});
