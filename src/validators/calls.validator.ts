/**
 * Payload shape confirmed live against prod-eu 2026-09-09 (real call
 * signaling via src/clients/sdk.client.ts — no REST equivalent exists).
 * All 4 signaling-only triggers share the same data.call.data envelope:
 * `action` mirrors the trigger's outcome, `entities.by`/`entities.for` are
 * who performed this action / the other party, `entities.on.entity.sessionid`
 * is the call's correlation id (see webhook.matcher.ts's byCallSessionId).
 *
 * Important, verified live: the TOP-LEVEL `call.sender`/`call.receiver`
 * reflect who performed *this specific action* (matching `entities.by`/
 * `entities.for`) — NOT the original call's fixed parties. For
 * call_rejected these come back flipped (sender = the receiver who
 * rejected) since the receiver is the one acting. The original call's
 * stable sender/receiver live at `entities.on.entity.sender`/`.receiver`
 * instead, unchanged across all 4 events regardless of who acts.
 */
import { expect } from '@playwright/test';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';
import { validateEnvelope } from './common.validator';

function validateCallEnvelope(
  payload: ReceivedWebhookPayload,
  trigger: string,
  expected: { action: string; sessionId: string; sender: string; receiver: string; by: string }
) {
  validateEnvelope(payload, trigger);
  const call = payload.data.call;
  const onEntity = call.data.entities.on.entity;
  expect(onEntity.sender).toBe(expected.sender);
  expect(onEntity.receiver).toBe(expected.receiver);
  expect(onEntity.sessionid).toBe(expected.sessionId);
  expect(onEntity.status).toBe(expected.action);
  expect(call.receiverType).toBe('user');
  expect(call.data.action).toBe(expected.action);
  expect(call.data.entities.by.entity.uid).toBe(expected.by);
}

export function validateCallInitiated(payload: ReceivedWebhookPayload, expected: { sessionId: string; sender: string; receiver: string }) {
  validateCallEnvelope(payload, 'call_initiated', { ...expected, action: 'initiated', by: expected.sender });
}

export function validateCallUnanswered(payload: ReceivedWebhookPayload, expected: { sessionId: string; sender: string; receiver: string }) {
  validateCallEnvelope(payload, 'call_unanswered', { ...expected, action: 'unanswered', by: expected.sender });
}

export function validateCallCancelled(payload: ReceivedWebhookPayload, expected: { sessionId: string; sender: string; receiver: string }) {
  validateCallEnvelope(payload, 'call_cancelled', { ...expected, action: 'cancelled', by: expected.sender });
}

export function validateCallRejected(payload: ReceivedWebhookPayload, expected: { sessionId: string; sender: string; receiver: string }) {
  validateCallEnvelope(payload, 'call_rejected', { ...expected, action: 'rejected', by: expected.receiver });
}

/**
 * call_busy is signaled explicitly (CometChat.rejectCall(sessionId, BUSY))
 * by the already-busy receiver — not automatic. Confirmed live 2026-09-09:
 * a second call to someone already on an active call just rings normally
 * unless the receiving client detects this itself and rejects as busy.
 * Same envelope shape as call_rejected — `by` is the busy receiver.
 */
export function validateCallBusy(payload: ReceivedWebhookPayload, expected: { sessionId: string; sender: string; receiver: string }) {
  validateCallEnvelope(payload, 'call_busy', { ...expected, action: 'busy', by: expected.receiver });
}

/**
 * The 4 media-session triggers below use a completely different, flatter
 * payload shape than the signaling ones above — they come from CometChat's
 * separate RTC infrastructure, not the chat-message-action layer. Confirmed
 * live 2026-09-09 via a real 2-party call, fully joined via
 * @cometchat/calls-sdk-javascript (src/clients/call-session.client.ts).
 */

export function validateCallStarted(payload: ReceivedWebhookPayload, expected: { sessionId: string }) {
  validateEnvelope(payload, 'call_started');
  expect(payload.data.sessionId).toBe(expected.sessionId);
}

export function validateCallParticipantJoined(payload: ReceivedWebhookPayload, expected: { sessionId: string; uid: string }) {
  validateEnvelope(payload, 'call_participant_joined');
  expect(payload.data.sessionId).toBe(expected.sessionId);
  expect(payload.data.occupant.uid).toBe(expected.uid);
}

export function validateCallParticipantLeft(payload: ReceivedWebhookPayload, expected: { sessionId: string; uid: string }) {
  validateEnvelope(payload, 'call_participant_left');
  expect(payload.data.sessionId).toBe(expected.sessionId);
  expect(payload.data.occupant.uid).toBe(expected.uid);
}

export function validateCallEnded(payload: ReceivedWebhookPayload, expected: { sessionId: string; participantUids: string[] }) {
  validateEnvelope(payload, 'call_ended');
  expect(payload.data.sessionId).toBe(expected.sessionId);
  const uids = payload.data.all_occupants.map((o: { uid: string }) => o.uid);
  for (const uid of expected.participantUids) expect(uids).toContain(uid);
}
