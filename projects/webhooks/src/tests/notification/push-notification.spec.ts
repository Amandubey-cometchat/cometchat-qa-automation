import { test } from '@playwright/test';
import { sendMessage } from '../../triggers/notification/notification.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validatePushNotificationGenerated } from '../../validators/notification.validator';
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
// -> Custom Push Notification Provider is enabled with this environment's
// receiver URL entered — see README "Notifications". Confirmed live
// 2026-09-15 on prod-eu; unlike Email/SMS, no observed ~1 min delay (fires
// promptly), but the same generous timeout is used for consistency and
// margin since only one data point has been observed.
test('push-notification-payload-generated webhook fires', async () => {
  const text = uniqueMessageText('push-notification-check');
  await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const payload = await expectWebhookEvent('push-notification-payload-generated', matchers.byNotificationRecipientUid(QA_USER_2), NOTIFICATION_TIMEOUT_MS);

  validatePushNotificationGenerated(payload, { recipientUid: QA_USER_2, senderUid: QA_USER_1, text });
});
