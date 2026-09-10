/**
 * Trigger layer for CAMPAIGN webhooks — all pure REST, confirmed live
 * 2026-09-10 against prod-eu. CometChat's Campaigns product (docs:
 * cometchat.com/docs/campaigns) is a notification management system —
 * unrelated to Calls/Meetings despite the shared category name in this
 * registry. A real production request the user captured showed their app
 * sends a custom group message as its own in-app "you have a notification"
 * invite layer; that's unrelated to what actually fires these webhooks
 * (a real Campaigns send), so it's not replicated here.
 */
import * as campaignsClient from '../../clients/campaigns.client';

/** Creates a fresh in_app channel + approved template pair — the prerequisite for any notification/campaign send. Channel/template names must be unique per CometChat, so a fresh pair is created per call, matching this project's unique-guid-per-test convention elsewhere. */
export async function setupInAppChannelAndTemplate(label: string, content: { title: string; body: string }) {
  const unique = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = await campaignsClient.createChannel(`QA ${unique}`);
  const template = await campaignsClient.createTemplate(`QA ${unique} Template`, channel.channelId, 'in_app', content);
  return { channel, template };
}

/** after_notification_created + after_feed_item_sent: a transactional notification sent directly, no campaign involved. */
export async function sendTransactionalNotification(receiverUid: string, label = 'notification') {
  const { template } = await setupInAppChannelAndTemplate(label, { title: 'QA Test', body: 'Automated test notification' });
  const send = await campaignsClient.sendNotification(template.templateId, [receiverUid]);
  return { notificationId: send.notificationId, templateId: template.templateId };
}

/** after_feed_item_read (and, as an observed side effect, after_feed_item_delivered — CometChat sets both deliveredAt and readAt together): mark a feed item read on the receiver's behalf. */
export const markFeedItemRead = campaignsClient.markFeedItemRead;

/** after_campaign_completed: create a campaign, add one recipient, and send it. */
export async function sendCampaignTo(receiverUid: string, label = 'campaign') {
  const { template } = await setupInAppChannelAndTemplate(label, { title: 'QA Campaign', body: 'Automated test campaign' });
  const campaign = await campaignsClient.createCampaign(`QA ${label} ${Date.now()}`, template.templateId, template.currentVersion);
  await campaignsClient.addCampaignRecipients(campaign.id, [receiverUid]);
  await campaignsClient.sendCampaign(campaign.id);
  return { campaignId: campaign.id };
}
