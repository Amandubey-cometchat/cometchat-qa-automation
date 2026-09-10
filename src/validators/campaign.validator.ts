/**
 * Payload shapes confirmed live against prod-eu 2026-09-10, via
 * src/triggers/campaign/campaign.triggers.ts (real Campaigns REST calls —
 * see cometchat.com/docs/campaigns and /docs/rest-api/campaigns-apis).
 * after_notification_created has its own envelope; the three feed-item
 * triggers (sent/delivered/read) share one flat shape, differing only in
 * `status`/which timestamp is newly populated.
 */
import { expect } from '@playwright/test';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';
import { validateEnvelope } from './common.validator';

export function validateNotificationCreated(payload: ReceivedWebhookPayload, expected: { notificationId: string; templateId: string }) {
  validateEnvelope(payload, 'after_notification_created');
  expect(payload.data.notificationId).toBe(expected.notificationId);
  expect(payload.data.templateId).toBe(expected.templateId);
  expect(payload.data.channels).toContain('in_app');
  expect(payload.data.sendMode).toBe('realtime');
}

function validateFeedItem(payload: ReceivedWebhookPayload, trigger: string, expected: { feedItemId?: string; notificationId: string; receiver: string; status: string }) {
  validateEnvelope(payload, trigger);
  if (expected.feedItemId) expect(payload.data.id).toBe(expected.feedItemId);
  else expect(payload.data.id).toBeTruthy();
  expect(payload.data.notificationId).toBe(expected.notificationId);
  expect(payload.data.receiver).toBe(expected.receiver);
  expect(payload.data.channelType).toBe('in_app');
  expect(payload.data.status).toBe(expected.status);
}

/** No feedItemId in `expected` — this event is the very first time it's known at all, so there's nothing independent to compare it against yet. */
export function validateFeedItemSent(payload: ReceivedWebhookPayload, expected: { notificationId: string; receiver: string }) {
  validateFeedItem(payload, 'after_feed_item_sent', { ...expected, status: 'sent' });
  expect(payload.data.sentAt).toBeTruthy();
  expect(payload.data.deliveredAt).toBeNull();
}

export function validateFeedItemDelivered(payload: ReceivedWebhookPayload, expected: { feedItemId: string; notificationId: string; receiver: string }) {
  // Confirmed live: marking a feed item read also sets deliveredAt at the
  // same moment (delivered is implicit, not a separately-actionable step),
  // so this fires with status already "read" — not "delivered".
  validateFeedItem(payload, 'after_feed_item_delivered', { ...expected, status: 'read' });
  expect(payload.data.deliveredAt).toBeTruthy();
}

export function validateFeedItemRead(payload: ReceivedWebhookPayload, expected: { feedItemId: string; notificationId: string; receiver: string }) {
  validateFeedItem(payload, 'after_feed_item_read', { ...expected, status: 'read' });
  expect(payload.data.readAt).toBeTruthy();
}

export function validateCampaignCompleted(payload: ReceivedWebhookPayload, expected: { campaignId: string }) {
  validateEnvelope(payload, 'after_campaign_completed');
  expect(payload.data.campaignId).toBe(expected.campaignId);
  expect(payload.data.status).toBe('completed');
  expect(payload.data.sentCount).toBeGreaterThan(0);
}
