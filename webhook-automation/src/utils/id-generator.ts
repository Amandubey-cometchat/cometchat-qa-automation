/**
 * Unique-ID generation for test data (groups, messages, etc.) — centralized
 * so every factory/trigger uses the same collision-avoidance strategy
 * instead of ad hoc `Date.now()` calls scattered through spec files.
 */

/** e.g. uniqueId('qa-group-created') -> "qa-group-created-mtn21x4k" */
export function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * .toString(36) rather than a raw decimal timestamp — a bare 10+ digit run
 * embedded in message text gets pattern-matched by CometChat's Moderation
 * Engine "Contact details filter" as a phone number, silently firing
 * moderation_engine_blocked instead of message_sent. Verified live. Use this
 * anywhere a timestamp needs to appear inside message *text* specifically.
 */
export function timestampToken(): string {
  return Date.now().toString(36);
}
