/**
 * validateEmailNotificationGenerated / validateSmsNotificationGenerated are
 * still provisional — sourced from CometChat's docs (email/sms-custom-
 * providers), NOT yet live-verified (see src/registry/notification.registry.ts).
 * Update once a real payload is captured, the same way
 * validatePushNotificationGenerated below already was — an earlier "Custom
 * Push Provider doesn't exist" claim in the registry turned out to be
 * wrong (an incomplete doc search, corrected once the user's own Dashboard
 * proved otherwise), and this validator reflects the real, live-captured
 * payload (prod-eu, 2026-09-15), not a doc guess.
 */
import { expect } from '@playwright/test';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';
import { validateEnvelope } from './common.validator';

export function validateEmailNotificationGenerated(payload: ReceivedWebhookPayload, expected: { recipientUid: string; senderUid: string }) {
  validateEnvelope(payload, 'email-notification-payload-generated');
  expect(payload.data.to.uid).toBe(expected.recipientUid);
  expect(Array.isArray(payload.data.messages)).toBe(true);
  expect(payload.data.messages.length).toBeGreaterThan(0);
  expect(payload.data.senderDetails.uid).toBe(expected.senderUid);
  expect(typeof payload.data.subject).toBe('string');
}

export function validateSmsNotificationGenerated(payload: ReceivedWebhookPayload, expected: { recipientUid: string; senderUid: string }) {
  validateEnvelope(payload, 'sms-notification-payload-generated');
  expect(payload.data.to.uid).toBe(expected.recipientUid);
  expect(Array.isArray(payload.data.messages)).toBe(true);
  expect(payload.data.messages.length).toBeGreaterThan(0);
  expect(payload.data.senderDetails.uid).toBe(expected.senderUid);
  expect(typeof payload.data.smsContent).toBe('string');
}

/** Live-verified 2026-09-15, prod-eu. For an ordinary chat message specifically — calls/reactions/group actions use notificationDetails.type/callAction fields this doesn't check. */
export function validatePushNotificationGenerated(payload: ReceivedWebhookPayload, expected: { recipientUid: string; senderUid: string; text: string }) {
  validateEnvelope(payload, 'push-notification-payload-generated');
  expect(payload.data.to.uid).toBe(expected.recipientUid);
  const details = payload.data.notificationDetails;
  expect(details.sender).toBe(expected.senderUid);
  expect(details.receiver).toBe(expected.recipientUid);
  expect(details.receiverType).toBe('user');
  expect(details.type).toBe('chat');
  expect(details.body).toBe(expected.text);
}
