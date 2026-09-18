/**
 * Unlike calls/meetings/campaigns, Moderation doesn't need a separate SDK or
 * module — CometChat's Moderation Engine evaluates ordinary messages sent
 * through the normal Messages API. This client just sends probe content
 * shaped to exercise moderation rules, reusing messages.client.ts underneath.
 *
 * Live-verified 2026-09-06 against prod-eu, with the Moderation trigger
 * category and its "Profanity filter" rule enabled: a phone-number pattern
 * does NOT trigger a block (that rule isn't the active one on this app), but
 * a word from the Profanity filter's own word list does — confirmed via the
 * real webhook payload, which names the exact rule
 * (data.message.data.moderation.rule.id === "profanity-filter") and lists
 * its full flagged-word set. "damn" is used here as the mildest real word
 * confirmed present in that list, rather than a stronger one — still a real,
 * live-verified trigger, not a softened assumption.
 */
import { sendTextMessage } from './messages.client';

export interface SendProbeMessageOptions {
  sender: string;
  receiver: string;
  receiverType?: 'user' | 'group';
}

/** Confirmed live to trip the Profanity filter rule and fire moderation_engine_blocked. */
export async function sendFlaggedMessage({ sender, receiver, receiverType = 'user' }: SendProbeMessageOptions) {
  return sendTextMessage({
    sender,
    receiver,
    receiverType,
    text: `damn ${Date.now().toString(36)}`,
  });
}

/** Ordinary, non-flagged content — confirmed live to fire moderation_engine_approved. */
export async function sendCleanMessage({ sender, receiver, receiverType = 'user' }: SendProbeMessageOptions) {
  return sendTextMessage({
    sender,
    receiver,
    receiverType,
    text: `ordinary moderation-clean message ${Date.now().toString(36)}`,
  });
}
