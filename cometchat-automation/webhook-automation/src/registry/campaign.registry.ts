import { WebhookRegistryEntry } from './webhook.registry';

// Confirmed live 2026-09-10: CometChat Campaigns (cometchat.com/docs/campaigns)
// is a real, working notification management system — pure REST + one real
// connected SDK session for the 3 client-reported triggers, via
// src/clients/campaigns.client.ts and sdk.client.ts. Docs weren't found by
// search earlier in this project (zero hits for "campaign") but do exist at
// a direct URL; the REST surface is fully documented as OpenAPI specs under
// /docs/rest-api/campaigns-apis/. All 9 pass on prod-eu and prod-us. REST
// calls also succeed on prod-in (Campaigns itself works there), but the
// webhooks never arrive — same "Dashboard trigger checkbox not enabled"
// pattern seen elsewhere in this project, not yet confirmed fixed there.
const VERIFIED_PROD: WebhookRegistryEntry['environments'] = ['prod-eu', 'prod-us'];

const IN_APP_KEYS = ['data.id', 'data.notificationId', 'data.receiver', 'data.status'];
const NOTIFICATION_KEYS = ['data.notificationId', 'data.templateId', 'data.channels', 'data.sendMode'];
const CAMPAIGN_KEYS = ['data.campaignId', 'data.status', 'data.sentCount'];
const PUSH_KEYS = ['data.pushNotificationId', 'data.notificationId', 'data.receiver', 'data.status'];

const AUTOMATED_ENTRIES: WebhookRegistryEntry[] = [
  {
    id: 'after_notification_created',
    automationMethod: 'REST' as const,
    trigger: 'POST /campaigns/notifications/messages (real Campaigns REST send)',
    expectedPayloadKeys: NOTIFICATION_KEYS,
    specFile: 'src/tests/campaign/after-notification-created.spec.ts',
  },
  {
    id: 'after_feed_item_sent',
    automationMethod: 'REST' as const,
    trigger: 'POST /campaigns/notifications/messages, in_app channel',
    expectedPayloadKeys: IN_APP_KEYS,
    specFile: 'src/tests/campaign/after-feed-item-sent.spec.ts',
  },
  {
    id: 'after_feed_item_delivered',
    automationMethod: 'REST' as const,
    trigger: 'POST /campaigns/notification-feed/{id}/read — delivered is set implicitly, not a separate action',
    expectedPayloadKeys: IN_APP_KEYS,
    specFile: 'src/tests/campaign/after-feed-item-delivered.spec.ts',
  },
  {
    id: 'after_feed_item_read',
    automationMethod: 'REST' as const,
    trigger: 'POST /campaigns/notification-feed/{id}/read',
    expectedPayloadKeys: IN_APP_KEYS,
    specFile: 'src/tests/campaign/after-feed-item-read.spec.ts',
  },
  {
    id: 'after_campaign_completed',
    automationMethod: 'REST' as const,
    trigger: 'POST /campaigns/campaigns + /recipients + /send',
    expectedPayloadKeys: CAMPAIGN_KEYS,
    specFile: 'src/tests/campaign/after-campaign-completed.spec.ts',
  },
  {
    id: 'after_feed_item_interacted',
    automationMethod: 'SDK' as const,
    trigger: 'CometChat.reportFeedEngagement via a real connected SDK session — no REST endpoint exists for this',
    expectedPayloadKeys: ['data.id', 'data.notificationId', 'data.receiver', 'data.engagedAt', 'data.topic'],
    specFile: 'src/tests/campaign/after-feed-item-interacted.spec.ts',
  },
  {
    id: 'after_push_notification_sent',
    automationMethod: 'REST' as const,
    trigger: 'POST /campaigns/notifications/messages, push channel — fires on dispatch attempt, no real FCM/APNs credentials required',
    expectedPayloadKeys: PUSH_KEYS,
    specFile: 'src/tests/campaign/after-push-notification-sent.spec.ts',
  },
  {
    id: 'after_push_notification_delivered',
    automationMethod: 'SDK' as const,
    trigger: 'CometChat.markPushNotificationDelivered via a real connected SDK session — client-reported, no real device required',
    expectedPayloadKeys: PUSH_KEYS,
    specFile: 'src/tests/campaign/after-push-notification-delivered.spec.ts',
  },
  {
    id: 'after_push_notification_clicked',
    automationMethod: 'SDK' as const,
    trigger: 'CometChat.markPushNotificationClicked via a real connected SDK session — client-reported, no real device required',
    expectedPayloadKeys: PUSH_KEYS,
    specFile: 'src/tests/campaign/after-push-notification-clicked.spec.ts',
  },
].map((e) => ({
  id: e.id,
  category: 'CAMPAIGN',
  environments: VERIFIED_PROD,
  trigger: e.trigger,
  expectedEvent: e.id,
  automationMethod: e.automationMethod,
  expectedPayloadKeys: e.expectedPayloadKeys,
  status: 'AUTOMATED',
  specFile: e.specFile,
  testTitleMatch: `${e.id} webhook fires`,
}));

const BLOCKED_REASON: Record<string, string> = {
  after_campaign_failed:
    'No reliable way found to trigger a genuine campaign failure — confirmed live 2026-09-10: adding a nonexistent/invalid ' +
    'user ID as the sole recipient and sending still produces after_campaign_completed (CometChat does not appear to ' +
    'validate recipient existence before considering the send complete). Would need a real, distinct failure condition ' +
    '(e.g. a since-deleted channel) that has not been identified yet.',
};

const BLOCKED_ENTRIES: WebhookRegistryEntry[] = Object.entries(BLOCKED_REASON).map(([id, reason]) => ({
  id,
  category: 'CAMPAIGN',
  environments: [],
  trigger: 'Real Campaigns/Notifications module action',
  expectedEvent: id,
  automationMethod: 'NONE',
  expectedPayloadKeys: [],
  status: 'BLOCKED',
  specFile: 'src/tests/campaign/campaign.spec.ts',
  testTitleMatch: `${id} (documented gap)`,
  reason,
}));

export const CAMPAIGN_REGISTRY: WebhookRegistryEntry[] = [...AUTOMATED_ENTRIES, ...BLOCKED_ENTRIES];
