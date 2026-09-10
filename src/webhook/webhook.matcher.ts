/**
 * Reusable matcher factories for the correlation IDs this project's webhooks
 * actually carry — every trigger/test builds its matcher from one of these
 * instead of hand-rolling an inline arrow function each time. Reduces the
 * `(p) => p?.data?.message?.id === String(id)` duplication that was
 * previously repeated across nearly every spec.
 */
export type WebhookMatcher = (payload: any) => boolean;

export function byMessageId(messageId: string | number): WebhookMatcher {
  return (p) => p?.data?.message?.id === String(messageId);
}

export function byReactionMessageId(messageId: string | number): WebhookMatcher {
  return (p) => p?.data?.reaction?.messageId === String(messageId);
}

export function byGroupGuid(guid: string): WebhookMatcher {
  return (p) => p?.data?.group?.guid === guid;
}

export function byBlockerUid(uid: string): WebhookMatcher {
  return (p) => p?.data?.by?.uid === uid;
}

export function byReceiptMessageId(messageId: string | number): WebhookMatcher {
  return (p) => p?.data?.body?.messageId === String(messageId);
}

export function byUserConnectionStatus(uid: string, action: 'connected' | 'disconnected'): WebhookMatcher {
  return (p) => p?.data?.user?.uid === uid && p?.data?.currentConnection?.action === action;
}

/** Calls signaling webhooks (initiated/unanswered/cancelled/rejected/busy) correlate via sessionId — verified live 2026-09-09. */
export function byCallSessionId(sessionId: string): WebhookMatcher {
  return (p) => p?.data?.call?.data?.entities?.on?.entity?.sessionid === sessionId;
}

/** Calls media-session webhooks (started/participant_joined/participant_left/ended) use a flat payload shape, distinct from the signaling ones above — verified live 2026-09-09. */
export function byCallMediaSessionId(sessionId: string): WebhookMatcher {
  return (p) => p?.data?.sessionId === sessionId;
}

/** Narrows call_participant_joined/left to one specific occupant, alongside byCallMediaSessionId. */
export function byCallOccupantUid(uid: string): WebhookMatcher {
  return (p) => p?.data?.occupant?.uid === uid;
}

/** Legacy webhooks (before_message specifically) fire before the message is persisted — no id exists yet to correlate by, so match on the unique text instead. Verified live 2026-09-09. */
export function byLegacyMessageText(text: string): WebhookMatcher {
  return (p) => p?.data?.data?.text === text;
}

/** Campaign webhooks (after_notification_created) correlate via notificationId. Verified live 2026-09-10. */
export function byNotificationId(notificationId: string): WebhookMatcher {
  return (p) => p?.data?.notificationId === notificationId;
}

/** Campaign feed-item webhooks (after_feed_item_sent/delivered/read) correlate via the feed item's own id — distinct from notificationId, which stays the same across all of a notification's per-recipient feed items. Verified live 2026-09-10. */
export function byFeedItemId(feedItemId: string): WebhookMatcher {
  return (p) => p?.data?.id === feedItemId;
}

/** Campaign webhooks (after_campaign_completed/failed) correlate via campaignId. Verified live 2026-09-10. */
export function byCampaignId(campaignId: string): WebhookMatcher {
  return (p) => p?.data?.campaignId === campaignId;
}

export function and(...matchers: WebhookMatcher[]): WebhookMatcher {
  return (p) => matchers.every((m) => m(p));
}
