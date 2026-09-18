/**
 * Registers a single webhook against your CometChat app and subscribes it
 * to every currently-available trigger. Safe to re-run (idempotent): it
 * looks for an existing webhook with the same URL before creating one.
 *
 * Docs:
 *  - Management APIs overview & auth: https://www.cometchat.com/docs/rest-api/management-apis
 *  - Webhook properties & triggers:    https://www.cometchat.com/docs/rest-api/management-apis/webhooks/overview
 *
 * Run: npx tsx scripts/register-webhooks.ts
 *
 * ── Why this needs different credentials than the rest of this project ──
 * Webhook CRUD (create/update/enable/disable/delete a webhook, or change its
 * subscribed triggers) lives on CometChat's separate Multi-Tenancy Management
 * API (base URL below), not the per-app Chat API that COMETCHAT_REST_API_KEY
 * authenticates against (used everywhere else in this project — see
 * src/clients/cometchat.client.ts). Confirmed against CometChat's own docs:
 * Management APIs use key/secret headers, not the apikey header, and
 * "Access to Multi-tenancy APIs is exclusive to clients with plans that
 * support this feature" — provisioned by CometChat Sales, not self-service.
 *
 * Set COMETCHAT_MGMT_KEY / COMETCHAT_MGMT_SECRET (from Sales) in
 * .env.<APP_ENV> to run this for real. Until then it fails fast below with a
 * clear message.
 *
 * NOTE: the exact webhook CRUD endpoint paths below (`/apps/{appId}/webhooks`
 * etc.) are transcribed from docs, not verified against a live call — this
 * project has never had Multi-Tenancy credentials to test with. Verify
 * against https://api-explorer.cometchat.com once you have real
 * COMETCHAT_MGMT_KEY/SECRET, before trusting this in CI.
 */
import { getConfig } from '../src/config/env';

function requireEnv(name: string, value: string | undefined, hint?: string) {
  if (!value) {
    console.error(`Missing required env var: ${name}${hint ? ` — ${hint}` : ''}`);
    process.exit(1);
  }
}

const config = getConfig();
requireEnv('COMETCHAT_MGMT_KEY', config.mgmtKey, 'Multi-Tenancy Management key from CometChat Sales — the per-app COMETCHAT_REST_API_KEY will NOT work here');
requireEnv('COMETCHAT_MGMT_SECRET', config.mgmtSecret, 'Multi-Tenancy Management secret from CometChat Sales, paired with COMETCHAT_MGMT_KEY');
requireEnv('WEBHOOK_RECEIVER_URL', config.webhookReceiverUrl);

const BASE_URL = 'https://apimgmt.cometchat.io';
const headers = { key: config.mgmtKey!, secret: config.mgmtSecret!, 'Content-Type': 'application/json' };

async function apiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const WEBHOOKS_PATH = `/apps/${config.appId}/webhooks`;
const WEBHOOK_ID = process.env.WEBHOOK_ID || 'qa-automation';

async function listExistingWebhooks() {
  const json = await apiRequest('GET', WEBHOOKS_PATH);
  return json.data || [];
}

async function listAvailableTriggers(): Promise<string[]> {
  // Trigger names are a fixed, documented set (not per-app) — see the docs
  // link above. Hardcoded here rather than fetched, since the docs don't
  // list a GET-all-triggers endpoint.
  return [
    'message_sent', 'message_edited', 'message_deleted', 'message_reaction_added', 'message_reaction_removed',
    'user_blocked', 'user_unblocked', 'user_connection_status_changed',
    'group_created', 'group_updated', 'group_deleted', 'group_member_joined', 'group_member_left',
    'group_member_added', 'group_member_kicked', 'group_member_banned', 'group_member_unbanned',
    'group_member_scope_changed', 'group_owner_transferred',
    'message_delivery_receipt', 'message_read_receipt', 'message_delivered_to_all', 'message_read_by_all',
    'call_initiated', 'call_started', 'call_participant_joined', 'call_participant_left', 'call_ended',
    'meeting_started', 'meeting_participant_joined', 'meeting_participant_left', 'meeting_ended',
    'recording_generated',
    'after_campaign_completed', 'after_campaign_failed', 'after_notification_created',
    'after_feed_item_sent', 'after_feed_item_delivered', 'after_feed_item_read', 'after_feed_item_interacted',
    'after_push_notification_sent', 'after_push_notification_delivered', 'after_push_notification_clicked',
  ];
}

async function createWebhook(triggerNames: string[]) {
  const body: Record<string, unknown> = { id: WEBHOOK_ID, name: WEBHOOK_ID, webhookURL: config.webhookReceiverUrl, enabled: true, triggers: triggerNames };
  if (config.webhookBasicAuthUser && config.webhookBasicAuthPass) {
    body.useBasicAuth = true;
    body.username = config.webhookBasicAuthUser;
    body.password = config.webhookBasicAuthPass;
  }
  const json = await apiRequest('POST', WEBHOOKS_PATH, body);
  return json.data;
}

async function updateTriggers(webhookId: string, triggerNames: string[]) {
  return apiRequest('PUT', `${WEBHOOKS_PATH}/${webhookId}`, { triggers: triggerNames });
}

(async () => {
  const triggerNames = await listAvailableTriggers();
  console.log(`${triggerNames.length} documented triggers to subscribe.`);

  console.log('Checking for an existing webhook pointed at this receiver...');
  const existing = await listExistingWebhooks();
  let webhook = existing.find((w: any) => w.webhookURL === config.webhookReceiverUrl || w.id === WEBHOOK_ID);

  if (webhook) {
    console.log(`Webhook already exists (id: ${webhook.id}). Updating its trigger list...`);
    await updateTriggers(webhook.id, triggerNames);
  } else {
    console.log('Creating new webhook, subscribed to all triggers...');
    webhook = await createWebhook(triggerNames);
    console.log(`Created webhook id: ${webhook.id}`);
  }

  console.log('Done. Webhook is registered and subscribed to every available event.');
  console.log(`Receiver URL: ${config.webhookReceiverUrl}`);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
