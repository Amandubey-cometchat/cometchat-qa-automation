import { expect } from '@playwright/test';
import { getConfig } from '../config/env';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';

/** Every webhook payload should be tagged with the app/region that sent it — cheap, high-value sanity check shared by every validator. */
export function validateEnvelope(payload: ReceivedWebhookPayload, expectedTrigger: string) {
  expect(payload.trigger).toBe(expectedTrigger);
  const { appId, region } = getConfig();
  if (payload.appId !== undefined) expect(payload.appId).toBe(appId);
  if (payload.region !== undefined) expect(payload.region).toBe(region);
}

/** Delivery-mechanics check via the receiver's own correlation metadata — not payload content, but real proof of how it arrived. */
export function validateDeliveryMechanics(payload: ReceivedWebhookPayload) {
  expect(payload.__event.method).toBe('POST');
  // Content-Type media types are case-insensitive per RFC 7231 — CometChat
  // sends "Application/json" (capital A), which is valid, just non-canonical.
  expect(payload.__event.headers['content-type']?.toLowerCase()).toContain('application/json');
}
