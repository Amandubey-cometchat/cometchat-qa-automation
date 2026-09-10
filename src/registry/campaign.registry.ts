import { WebhookRegistryEntry } from './webhook.registry';

// Confirmed live 2026-09-10: CometChat Campaigns (cometchat.com/docs/campaigns)
// is a real, working notification management system — pure REST, no
// ringing/SDK involved, via src/clients/campaigns.client.ts. Docs weren't
// found by search earlier in this project (zero hits for "campaign") but
// do exist at a direct URL; the REST surface is fully documented as
// OpenAPI specs under /docs/rest-api/campaigns-apis/. All 5 pass 5/5 on
// prod-eu and prod-us. REST calls also succeed on prod-in (Campaigns
// itself works there), but the webhooks never arrive — same "Dashboard
// trigger checkbox not enabled" pattern seen elsewhere in this project,
// not yet confirmed fixed there.
const VERIFIED_PROD: WebhookRegistryEntry['environments'] = ['prod-eu', 'prod-us'];

const IN_APP_KEYS = ['data.id', 'data.notificationId', 'data.receiver', 'data.status'];
const NOTIFICATION_KEYS = ['data.notificationId', 'data.templateId', 'data.channels', 'data.sendMode'];
const CAMPAIGN_KEYS = ['data.campaignId', 'data.status', 'data.sentCount'];

const AUTOMATED_ENTRIES: WebhookRegistryEntry[] = [
  {
    id: 'after_notification_created',
    trigger: 'POST /campaigns/notifications/messages (real Campaigns REST send)',
    expectedPayloadKeys: NOTIFICATION_KEYS,
    specFile: 'src/tests/campaign/after-notification-created.spec.ts',
  },
  {
    id: 'after_feed_item_sent',
    trigger: 'POST /campaigns/notifications/messages, in_app channel',
    expectedPayloadKeys: IN_APP_KEYS,
    specFile: 'src/tests/campaign/after-feed-item-sent.spec.ts',
  },
  {
    id: 'after_feed_item_delivered',
    trigger: 'POST /campaigns/notification-feed/{id}/read — delivered is set implicitly, not a separate action',
    expectedPayloadKeys: IN_APP_KEYS,
    specFile: 'src/tests/campaign/after-feed-item-delivered.spec.ts',
  },
  {
    id: 'after_feed_item_read',
    trigger: 'POST /campaigns/notification-feed/{id}/read',
    expectedPayloadKeys: IN_APP_KEYS,
    specFile: 'src/tests/campaign/after-feed-item-read.spec.ts',
  },
  {
    id: 'after_campaign_completed',
    trigger: 'POST /campaigns/campaigns + /recipients + /send',
    expectedPayloadKeys: CAMPAIGN_KEYS,
    specFile: 'src/tests/campaign/after-campaign-completed.spec.ts',
  },
].map((e) => ({
  id: e.id,
  category: 'CAMPAIGN',
  environments: VERIFIED_PROD,
  trigger: e.trigger,
  expectedEvent: e.id,
  automationMethod: 'REST',
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
  after_feed_item_interacted:
    'No REST endpoint found for marking a feed item "interacted" (checked the documented Notification Feed REST surface ' +
    'and several plausible undocumented paths — /engage, /interact, /click, /clicked, /interacted, /engaged all 404). ' +
    'The payload has an engagedAt field, suggesting this is client SDK-tracked (a real tap/click in the notification feed ' +
    'UI), not an admin-triggerable REST action — same class of gap as message read/delivery receipts before sdk.client.ts.',
  after_push_notification_sent:
    'Needs a push channel (Campaigns supports at most 1 per app) with real FCM/APNs credentials configured, which is not ' +
    'confirmed to exist on any of the 4 apps — push notification config is managed at the CometChat app level, not ' +
    'something this project can set up via REST.',
  after_push_notification_delivered: 'Same push-channel/FCM/APNs prerequisite as after_push_notification_sent, plus a real registered device to deliver to.',
  after_push_notification_clicked: 'Same prerequisites as after_push_notification_delivered, plus a real user interaction on a real device — no REST equivalent exists for this by nature.',
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
