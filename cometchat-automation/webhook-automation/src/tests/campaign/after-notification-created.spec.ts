import { test } from '@playwright/test';
import { sendTransactionalNotification } from '../../triggers/campaign/campaign.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateNotificationCreated } from '../../validators/campaign.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('after_notification_created webhook fires when a transactional notification is sent', async () => {
  const { notificationId, templateId } = await sendTransactionalNotification(QA_USER_2, 'notif-created');

  const payload = await expectWebhookEvent('after_notification_created', matchers.byNotificationId(notificationId));

  validateNotificationCreated(payload, { notificationId, templateId });
});
