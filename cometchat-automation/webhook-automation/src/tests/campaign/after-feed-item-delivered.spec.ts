import { test } from '@playwright/test';
import { sendTransactionalNotification, markFeedItemRead } from '../../triggers/campaign/campaign.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateFeedItemDelivered } from '../../validators/campaign.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

// Confirmed live 2026-09-10: there's no separate "mark delivered" action —
// marking a feed item read implicitly sets it delivered at the same
// moment, and fires both after_feed_item_delivered and after_feed_item_read
// from that one action.
test('after_feed_item_delivered webhook fires when the recipient marks a feed item read', async () => {
  const { notificationId } = await sendTransactionalNotification(QA_USER_2, 'feed-delivered');
  const sentPayload = await expectWebhookEvent('after_feed_item_sent', matchers.byNotificationId(notificationId));
  const feedItemId = sentPayload.data.id;

  await resetEvents();
  await markFeedItemRead(feedItemId, QA_USER_2);

  const payload = await expectWebhookEvent('after_feed_item_delivered', matchers.byFeedItemId(feedItemId));

  validateFeedItemDelivered(payload, { feedItemId, notificationId, receiver: QA_USER_2 });
});
