/**
 * Payload shape confirmed live against prod-eu 2026-09-09 — structurally
 * identical to Calls' media-session triggers (call_started/participant_
 * joined/left/ended, see calls.validator.ts): a flat data.sessionId/
 * data.occupant/data.all_occupants shape from CometChat's RTC
 * infrastructure, just under the meeting_* trigger names. Matchers are
 * shared with Calls (webhook.matcher.ts's byCallMediaSessionId/
 * byCallOccupantUid) since the payload shape is identical — not
 * duplicated here.
 */
import { expect } from '@playwright/test';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';
import { validateEnvelope } from './common.validator';

export function validateMeetingStarted(payload: ReceivedWebhookPayload, expected: { sessionId: string }) {
  validateEnvelope(payload, 'meeting_started');
  expect(payload.data.sessionId).toBe(expected.sessionId);
}

export function validateMeetingParticipantJoined(payload: ReceivedWebhookPayload, expected: { sessionId: string; uid: string }) {
  validateEnvelope(payload, 'meeting_participant_joined');
  expect(payload.data.sessionId).toBe(expected.sessionId);
  expect(payload.data.occupant.uid).toBe(expected.uid);
}

export function validateMeetingParticipantLeft(payload: ReceivedWebhookPayload, expected: { sessionId: string; uid: string }) {
  validateEnvelope(payload, 'meeting_participant_left');
  expect(payload.data.sessionId).toBe(expected.sessionId);
  expect(payload.data.occupant.uid).toBe(expected.uid);
}

export function validateMeetingEnded(payload: ReceivedWebhookPayload, expected: { sessionId: string; participantUids: string[] }) {
  validateEnvelope(payload, 'meeting_ended');
  expect(payload.data.sessionId).toBe(expected.sessionId);
  const uids = payload.data.all_occupants.map((o: { uid: string }) => o.uid);
  for (const uid of expected.participantUids) expect(uids).toContain(uid);
}
