import { test } from '@playwright/test';
import { sendTransactionalNotification } from '../../triggers/campaign/campaign.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateFeedItemSent } from '../../validators/campaign.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('after_feed_item_sent webhook fires for the recipient of an in_app notification', async () => {
  const { notificationId } = await sendTransactionalNotification(QA_USER_2, 'feed-sent');

  const payload = await expectWebhookEvent('after_feed_item_sent', matchers.byNotificationId(notificationId));

  validateFeedItemSent(payload, { notificationId, receiver: QA_USER_2 });
});
