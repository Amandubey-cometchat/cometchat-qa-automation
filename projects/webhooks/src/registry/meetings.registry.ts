import { WebhookRegistryEntry } from './webhook.registry';

// Confirmed live 2026-09-09: Meetings use CometChat's "Call Sessions" —
// participants join a session directly via a session ID, no ringing/
// signaling step at all. Two sessions joining the same arbitrary ID fired
// meeting_started/meeting_participant_joined immediately — see
// src/triggers/meetings/meetings.triggers.ts. All 4 pass 4/4 on all 3
// prod apps (prod-eu, prod-us, prod-in).
const ALL_PROD: WebhookRegistryEntry['environments'] = ['prod-eu', 'prod-us', 'prod-in'];
const SESSION_IDS = ['meeting_started', 'meeting_participant_joined', 'meeting_participant_left', 'meeting_ended'];

const UNTESTABLE_REASON = {
  recording_generated:
    'Requires recording actually enabled for the session (autoStartRecording, or an app-level recording feature) — ' +
    "not yet confirmed whether that's on for any of the 4 apps, and this is async (real processing delay after the " +
    'session ends before the recording is ready), unlike every other Meetings/Calls trigger.',
  transcription_generated:
    'Voice transcription is a separate paid extension (Rev.ai-backed), not a built-in Calls/Meetings SDK feature — ' +
    'needs its own Rev.ai account and Dashboard configuration, which is not confirmed to exist on any of the 4 apps. ' +
    'Not something more research or live probing from this project can resolve on its own.',
};

const sessionEntries: WebhookRegistryEntry[] = SESSION_IDS.map((id) => ({
  id,
  category: 'MEETINGS',
  environments: ALL_PROD,
  trigger: 'Real Calls SDK session join, no ringing (CometChatCalls.joinSession with an arbitrary session ID)',
  expectedEvent: id,
  automationMethod: 'SDK',
  expectedPayloadKeys: ['data.sessionId'],
  status: 'AUTOMATED',
  specFile: `src/tests/meetings/${id.replace(/_/g, '-')}.spec.ts`,
  testTitleMatch: `${id} webhook fires`,
}));

const untestableEntries: WebhookRegistryEntry[] = Object.entries(UNTESTABLE_REASON).map(([id, reason]) => ({
  id,
  category: 'MEETINGS',
  environments: [],
  trigger: 'Recording/transcription generated for a Calls or Meetings session',
  expectedEvent: id,
  automationMethod: 'NONE',
  expectedPayloadKeys: [],
  status: 'BLOCKED',
  specFile: 'src/tests/meetings/meetings.spec.ts',
  testTitleMatch: `${id} (documented gap)`,
  reason,
}));

export const MEETINGS_REGISTRY: WebhookRegistryEntry[] = [...sessionEntries, ...untestableEntries];
