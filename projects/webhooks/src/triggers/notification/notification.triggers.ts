/**
 * Trigger layer for NOTIFICATION webhooks. Per CometChat's docs
 * (email/sms-custom-providers), these fire passively off an ordinary
 * message send — once per recipient — when the Custom Email/SMS Provider
 * is configured, not from any distinct API call. Same pattern as Legacy
 * webhooks reusing Modern's sendMessage: no new client method needed.
 */
import { sendTextMessage } from '../../clients/messages.client';

export const sendMessage = sendTextMessage;
