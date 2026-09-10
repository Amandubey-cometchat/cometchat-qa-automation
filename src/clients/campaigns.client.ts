/**
 * Real REST wrappers for CometChat's Campaigns product — confirmed live
 * 2026-09-10 against prod-eu. Base path is /campaigns under the same
 * per-app host as the rest of this project's REST calls
 * (https://{appId}.api-{region}.cometchat.io/v3/campaigns), same apikey
 * auth — see cometchat.client.ts's apiRequest.
 *
 * Real, reproducible finding from building this: POST
 * /notification-feed/{id}/read 408s (ERR_SERVICE_TIMEOUT) if the request
 * carries ANY body at all — even an empty `{}`. Every call here that takes
 * no meaningful payload passes `undefined` explicitly, not `{}`.
 */
import { apiRequest } from './cometchat.client';

export interface CampaignChannel {
  id: string;
  channelId: string;
  name: string;
  type: string;
  enabled: boolean;
}

export interface CampaignTemplate {
  id: string;
  templateId: string;
  name: string;
  status: string;
  currentVersion: number;
}

export async function createChannel(name: string, type: 'in_app' | 'push' = 'in_app'): Promise<CampaignChannel> {
  return apiRequest('POST', '/campaigns/channels', { name, type, enabled: true });
}

export async function createTemplate(
  name: string,
  channelId: string,
  channelType: 'in_app' | 'push',
  content: Record<string, unknown>
): Promise<CampaignTemplate> {
  return apiRequest('POST', '/campaigns/templates', {
    name,
    status: 'approved',
    channels: [{ channelId, channelType, dataType: 'data_template', content }],
  });
}

export async function sendNotification(
  templateId: string,
  receivers: string[],
  variables?: Record<string, Record<string, unknown>>
): Promise<{ notificationId: string; channels: string[]; mode: string }> {
  return apiRequest('POST', '/campaigns/notifications/messages', { templateId, receivers, variables });
}

/** Requires the onbehalfof header (the user "viewing" their own feed) — no body, see the file header comment. */
export async function markFeedItemRead(feedItemId: string, onBehalfOfUid: string): Promise<any> {
  return apiRequest('POST', `/campaigns/notification-feed/${feedItemId}/read`, undefined, { onbehalfof: onBehalfOfUid });
}

export async function createCampaign(name: string, templateId: string, templateVersion: number): Promise<{ id: string }> {
  return apiRequest('POST', '/campaigns/campaigns', { name, templateId, templateVersion });
}

export async function addCampaignRecipients(campaignId: string, userIds: string[]): Promise<{ added: number }> {
  return apiRequest('POST', `/campaigns/campaigns/${campaignId}/recipients`, { userIds });
}

export async function sendCampaign(campaignId: string): Promise<any> {
  return apiRequest('POST', `/campaigns/campaigns/${campaignId}/send`, undefined);
}
