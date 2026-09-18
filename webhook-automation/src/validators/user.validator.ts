import { expect } from '@playwright/test';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';
import { validateEnvelope } from './common.validator';

export function validateUserBlocked(payload: ReceivedWebhookPayload, expected: { blocker: string; blocked: string }) {
  validateEnvelope(payload, 'user_blocked');
  expect(payload.data.by.uid).toBe(expected.blocker);
  expect(payload.data.users).toHaveProperty(expected.blocked);
}

export function validateUserUnblocked(payload: ReceivedWebhookPayload, expected: { unblocker: string; unblocked: string }) {
  validateEnvelope(payload, 'user_unblocked');
  expect(payload.data.by.uid).toBe(expected.unblocker);
  expect(payload.data.users).toHaveProperty(expected.unblocked);
}

export function validateConnectionStatusChanged(payload: ReceivedWebhookPayload, expected: { uid: string; status: 'online' | 'offline'; action: 'connected' | 'disconnected' }) {
  validateEnvelope(payload, 'user_connection_status_changed');
  expect(payload.data.status).toBe(expected.status);
  expect(payload.data.user.uid).toBe(expected.uid);
  expect(payload.data.currentConnection.action).toBe(expected.action);
}
