import { test } from '@playwright/test';
import { sendTransactionalNotification, connectReceiverSession, reportFeedItemEngagement } from '../../triggers/campaign/campaign.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateFeedItemInteracted } from '../../validators/campaign.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// No REST endpoint exists for this — checked the documented surface plus
// several plausible undocumented paths, all 404. CometChat.
// reportFeedEngagement (via a real, connected SDK session) is the only way.
test('after_feed_item_interacted webhook fires when the recipient reports engagement', async () => {
  const { notificationId } = await sendTransactionalNotification(QA_USER_2, 'feed-interacted');
  const sentPayload = await expectWebhookEvent('after_feed_item_sent', matchers.byNotificationId(notificationId));
  const feedItemId = sentPayload.data.id;

  const client = await connectReceiverSession(QA_USER_2);
  registerCleanup(() => client.close());

  await resetEvents();
  await reportFeedItemEngagement(client, feedItemId, 'clicked');

  const payload = await expectWebhookEvent('after_feed_item_interacted', matchers.byFeedItemId(feedItemId));

  validateFeedItemInteracted(payload, { feedItemId, notificationId, receiver: QA_USER_2, interactionString: 'clicked' });
});
