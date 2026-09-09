import { WebhookRegistryEntry } from './webhook.registry';

// Confirmed live 2026-09-09 against prod-eu: the Calls & Meeting add-on is
// enabled there (GET /calls on the real Calls REST API returned 200, empty
// log — not an add-on-disabled error). Unconfirmed on prod-us/prod-in/
// staging-us; environments below reflect only what's actually been verified.
const VERIFIED_ENV: WebhookRegistryEntry['environments'] = ['prod-eu'];

const MEDIA_SESSION_REASON =
  'Requires actually joining the WebRTC call session via the separate @cometchat/calls-sdk-javascript package ' +
  '(CometChatCalls.joinSession), not just Chat SDK signaling — confirmed live 2026-09-09: accepting a call at ' +
  'the signaling level (CometChat.acceptCall) without joining the media session does not make the receiver ' +
  '"busy" to a second incoming call, and does not fire call_started/participant events. Needs Playwright launched ' +
  'with --use-fake-device-for-media-stream (no real camera/mic required, officially supported for this).';

const SIGNALING_IDS = ['call_initiated', 'call_unanswered', 'call_cancelled', 'call_rejected'];
const MEDIA_SESSION_IDS = ['call_started', 'call_participant_joined', 'call_participant_left', 'call_ended', 'call_busy'];

const SIGNALING_ENTRIES: WebhookRegistryEntry[] = SIGNALING_IDS.map((id) => ({
  id,
  category: 'CALLS',
  environments: VERIFIED_ENV,
  trigger: 'Real Chat SDK call signaling session',
  expectedEvent: id,
  automationMethod: 'SDK',
  expectedPayloadKeys: ['data.call.sender', 'data.call.receiver', 'data.call.data.action', 'data.call.data.entities.on.entity.sessionid'],
  status: 'AUTOMATED',
  specFile: `src/tests/calls/${id.replace(/_/g, '-')}.spec.ts`,
  testTitleMatch: `${id} webhook fires`,
}));

const MEDIA_SESSION_ENTRIES: WebhookRegistryEntry[] = MEDIA_SESSION_IDS.map((id) => ({
  id,
  category: 'CALLS',
  environments: [],
  trigger: 'Real Calls SDK WebRTC session lifecycle action',
  expectedEvent: id,
  automationMethod: 'NONE',
  expectedPayloadKeys: [],
  status: 'BLOCKED',
  specFile: 'src/tests/calls/calls.spec.ts',
  testTitleMatch: `${id} (documented gap)`,
  reason: MEDIA_SESSION_REASON,
}));

export const CALLS_REGISTRY: WebhookRegistryEntry[] = [...SIGNALING_ENTRIES, ...MEDIA_SESSION_ENTRIES];
