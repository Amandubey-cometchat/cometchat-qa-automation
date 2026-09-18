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
