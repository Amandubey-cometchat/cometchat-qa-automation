/**
 * Legacy webhook payloads are structurally different from every modern
 * webhook in this project — confirmed live 2026-09-09 (prod-eu, real
 * message via the Legacy Webhooks system). Message-shaped fields
 * (sender/receiver/data.text) sit directly under `data`, not nested under
 * `data.message` the way modern message_sent etc. do. before_message
 * specifically has no message id yet (it fires before persistence) — see
 * webhook.matcher.ts's byLegacyMessageText for how tests correlate it.
 */
import { expect } from '@playwright/test';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';
import { validateEnvelope } from './common.validator';

export function validateBeforeMessage(payload: ReceivedWebhookPayload, expected: { sender: string; receiver: string; text: string }) {
  validateEnvelope(payload, 'before_message');
  expect(payload.data.sender).toBe(expected.sender);
  expect(payload.data.receiver).toBe(expected.receiver);
  expect(payload.data.receiverType).toBe('user');
  expect(payload.data.data.text).toBe(expected.text);
  expect(payload.data.data.entities.sender.entity.uid).toBe(expected.sender);
  expect(payload.data.data.entities.receiver.entity.uid).toBe(expected.receiver);
}

/** after_message — same shape family as before_message (message fields directly under data, not data.message), but fires after persistence so a real id exists. Live-verified 2026-09-15, prod-us. */
export function validateAfterMessage(payload: ReceivedWebhookPayload, expected: { id: string | number; sender: string; receiver: string; text: string }) {
  validateEnvelope(payload, 'after_message');
  expect(payload.data.id).toBe(String(expected.id));
  expect(payload.data.sender).toBe(expected.sender);
  expect(payload.data.receiver).toBe(expected.receiver);
  expect(payload.data.receiverType).toBe('user');
  expect(payload.data.data.text).toBe(expected.text);
}

/**
 * message_delivery_receipt_legacy / message_read_receipt_legacy — a
 * completely different field layout from the modern receipts (data.body.*),
 * confirming this project's long-standing assumption that Legacy payloads
 * can't be inferred from Modern ones. messageSender/receiptReceiver are
 * both the original message's sender; receiptSender is whoever just
 * delivered/read it. Live-verified 2026-09-15, prod-us.
 */
export function validateLegacyReceipt(
  payload: ReceivedWebhookPayload,
  expected: { trigger: 'message_delivery_receipt' | 'message_read_receipt'; receiptType: 'delivered' | 'read'; messageId: string | number; sender: string; recipient: string }
) {
  validateEnvelope(payload, expected.trigger);
  expect(payload.data.messageId).toBe(String(expected.messageId));
  expect(payload.data.receiptType).toBe(expected.receiptType);
  expect(payload.data.messageSender).toBe(expected.sender);
  expect(payload.data.receiptReceiver).toBe(expected.sender);
  expect(payload.data.receiptSender).toBe(expected.recipient);
  expect(payload.data.receiverType).toBe('user');
}

/** after_connection_status_changed (legacy) — data.user/data.event, distinct from modern user_connection_status_changed's data.user/data.status/data.currentConnection. Live-verified 2026-09-15, prod-us. */
export function validateLegacyConnectionStatusChanged(payload: ReceivedWebhookPayload, expected: { uid: string; status: 'online' | 'offline'; eventType: 'connected' | 'disconnected' }) {
  validateEnvelope(payload, 'after_connection_status_changed');
  expect(payload.data.user.uid).toBe(expected.uid);
  expect(payload.data.user.status).toBe(expected.status);
  expect(payload.data.event.type).toBe(expected.eventType);
}
