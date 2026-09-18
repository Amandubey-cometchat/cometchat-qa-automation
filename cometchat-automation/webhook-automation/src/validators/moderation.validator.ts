import { expect } from '@playwright/test';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';
import { validateEnvelope } from './common.validator';

/**
 * Real payload shapes captured live 2026-09-06 against prod-eu (Profanity
 * filter rule). Not assumed — see src/registry/moderation.registry.ts for
 * the probe history that got here.
 */

export function validateModerationBlocked(payload: ReceivedWebhookPayload, expected: { id: string | number; sender: string; receiver: string; text: string }) {
  validateEnvelope(payload, 'moderation_engine_blocked');
  expect(payload.data.message.id).toBe(String(expected.id));
  expect(payload.data.message.sender).toBe(expected.sender);
  expect(payload.data.message.receiver).toBe(expected.receiver);
  expect(payload.data.message.data.text).toBe(expected.text);
  expect(payload.data.message.data.moderation.status).toBe('disapproved');
  expect(payload.data.message.data.moderation.rule.id).toBe('profanity-filter');
  expect(Array.isArray(payload.data.moderation)).toBe(true);
  expect(payload.data.moderation[0].rule.id).toBe('profanity-filter');
  expect(payload.data.moderation[0].rule.action).toContain('blockMessage');
}

export function validateModerationApproved(payload: ReceivedWebhookPayload, expected: { id: string | number; sender: string; receiver: string; text: string }) {
  validateEnvelope(payload, 'moderation_engine_approved');
  expect(payload.data.message.id).toBe(String(expected.id));
  expect(payload.data.message.sender).toBe(expected.sender);
  expect(payload.data.message.receiver).toBe(expected.receiver);
  expect(payload.data.message.data.text).toBe(expected.text);
  expect(payload.data.message.data.moderation.status).toBe('approved');
}
