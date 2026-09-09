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
