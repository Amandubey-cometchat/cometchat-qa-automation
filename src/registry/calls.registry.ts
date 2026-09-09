import { WebhookRegistryEntry } from './webhook.registry';

// Confirmed live 2026-09-09: all 9 Calls webhooks pass the real spec files
// on all 3 prod apps (prod-eu, prod-us, prod-in — 9/9 each). Unconfirmed on
// staging-us (Calls & Meeting add-on status not checked there).
const ALL_PROD: WebhookRegistryEntry['environments'] = ['prod-eu', 'prod-us', 'prod-in'];
const SIGNALING_IDS = ['call_initiated', 'call_unanswered', 'call_cancelled', 'call_rejected', 'call_busy'];
const MEDIA_SESSION_IDS = ['call_started', 'call_participant_joined', 'call_participant_left', 'call_ended'];

function entry(id: string, environments: WebhookRegistryEntry['environments'], trigger: string, expectedPayloadKeys: string[]): WebhookRegistryEntry {
  return {
    id,
    category: 'CALLS',
    environments,
    trigger,
    expectedEvent: id,
    automationMethod: 'SDK',
    expectedPayloadKeys,
    status: 'AUTOMATED',
    specFile: `src/tests/calls/${id.replace(/_/g, '-')}.spec.ts`,
    testTitleMatch: `${id} webhook fires`,
  };
}

const SIGNALING_KEYS = ['data.call.sender', 'data.call.receiver', 'data.call.data.action', 'data.call.data.entities.on.entity.sessionid'];
const MEDIA_SESSION_KEYS = ['data.sessionId'];

export const CALLS_REGISTRY: WebhookRegistryEntry[] = [
  ...SIGNALING_IDS.map((id) => entry(id, ALL_PROD, 'Real Chat SDK call signaling session', SIGNALING_KEYS)),
  ...MEDIA_SESSION_IDS.map((id) =>
    entry(id, ALL_PROD, 'Real Calls SDK WebRTC session join (@cometchat/calls-sdk-javascript, fake media device)', MEDIA_SESSION_KEYS)
  ),
];
