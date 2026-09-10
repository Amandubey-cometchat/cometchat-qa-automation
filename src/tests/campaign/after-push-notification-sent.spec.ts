import { test } from '@playwright/test';
import { sendPushNotification } from '../../triggers/campaign/campaign.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validatePushNotificationSent } from '../../validators/campaign.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

// Confirmed live 2026-09-10: fires on CometChat's dispatch attempt — no real
// FCM/APNs credentials configured on this app, and it still fires.
test('after_push_notification_sent webhook fires when a push notification is sent', async () => {
  const { notificationId } = await sendPushNotification(QA_USER_2, 'push-sent');

  const payload = await expectWebhookEvent('after_push_notification_sent', matchers.byNotificationId(notificationId));

  validatePushNotificationSent(payload, { notificationId, receiver: QA_USER_2 });
});
