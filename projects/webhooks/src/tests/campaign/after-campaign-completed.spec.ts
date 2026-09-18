import { test } from '@playwright/test';
import { sendCampaignTo } from '../../triggers/campaign/campaign.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCampaignCompleted } from '../../validators/campaign.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('after_campaign_completed webhook fires when a campaign finishes sending', async () => {
  const { campaignId } = await sendCampaignTo(QA_USER_2, 'campaign-completed');

  const payload = await expectWebhookEvent('after_campaign_completed', matchers.byCampaignId(campaignId));

  validateCampaignCompleted(payload, { campaignId });
});
