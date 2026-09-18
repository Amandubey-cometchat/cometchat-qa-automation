import { test } from '@playwright/test';
import { sendTransactionalNotification, markFeedItemRead } from '../../triggers/campaign/campaign.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateFeedItemRead } from '../../validators/campaign.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('after_feed_item_read webhook fires when the recipient marks a feed item read', async () => {
  const { notificationId } = await sendTransactionalNotification(QA_USER_2, 'feed-read');
  const sentPayload = await expectWebhookEvent('after_feed_item_sent', matchers.byNotificationId(notificationId));
  const feedItemId = sentPayload.data.id;

  await resetEvents();
  await markFeedItemRead(feedItemId, QA_USER_2);

  const payload = await expectWebhookEvent('after_feed_item_read', matchers.byFeedItemId(feedItemId));

  validateFeedItemRead(payload, { feedItemId, notificationId, receiver: QA_USER_2 });
});
