import { test } from '@playwright/test';
import { sendPushNotification, connectReceiverSession, markPushClicked } from '../../triggers/campaign/campaign.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validatePushNotificationClicked } from '../../validators/campaign.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// Confirmed live 2026-09-10: same as delivered — CometChat.
// markPushNotificationClicked is client-reported, no real device required.
test('after_push_notification_clicked webhook fires when the client reports a click', async () => {
  const { notificationId } = await sendPushNotification(QA_USER_2, 'push-clicked');
  const sentPayload = await expectWebhookEvent('after_push_notification_sent', matchers.byNotificationId(notificationId));
  const pushNotificationId = sentPayload.data.pushNotificationId;

  const client = await connectReceiverSession(QA_USER_2);
  registerCleanup(() => client.close());

  await resetEvents();
  await markPushClicked(client, pushNotificationId);

  const payload = await expectWebhookEvent('after_push_notification_clicked', matchers.byPushNotificationId(pushNotificationId));

  validatePushNotificationClicked(payload, { pushNotificationId, notificationId, receiver: QA_USER_2 });
});
