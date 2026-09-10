import { test } from '@playwright/test';
import { sendPushNotification, connectReceiverSession, markPushDelivered } from '../../triggers/campaign/campaign.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validatePushNotificationDelivered } from '../../validators/campaign.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// Confirmed live 2026-09-10: CometChat.markPushNotificationDelivered is
// client-reported — no real FCM/APNs delivery to a real device is required
// to fire this, a constructed PushNotification object is enough.
test('after_push_notification_delivered webhook fires when the client reports delivery', async () => {
  const { notificationId } = await sendPushNotification(QA_USER_2, 'push-delivered');
  const sentPayload = await expectWebhookEvent('after_push_notification_sent', matchers.byNotificationId(notificationId));
  const pushNotificationId = sentPayload.data.pushNotificationId;

  const client = await connectReceiverSession(QA_USER_2);
  registerCleanup(() => client.close());

  await resetEvents();
  await markPushDelivered(client, pushNotificationId);

  const payload = await expectWebhookEvent('after_push_notification_delivered', matchers.byPushNotificationId(pushNotificationId));

  validatePushNotificationDelivered(payload, { pushNotificationId, notificationId, receiver: QA_USER_2 });
});
