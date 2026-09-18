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

/** after_message (legacy, fires after persistence so a real id exists) — id sits directly under data, not data.message like every modern message webhook. Verified live 2026-09-15. */
export function byLegacyMessageId(messageId: string | number): WebhookMatcher {
  return (p) => p?.data?.id === String(messageId);
}

/** message_delivery_receipt_legacy / message_read_receipt_legacy correlate via data.messageId directly — no data.body nesting like the modern receipts. Verified live 2026-09-15. */
export function byLegacyReceiptMessageId(messageId: string | number): WebhookMatcher {
  return (p) => p?.data?.messageId === String(messageId);
}

/** after_connection_status_changed (legacy) — structurally distinct from modern user_connection_status_changed (data.user/data.event, not data.user/data.status/data.currentConnection). Verified live 2026-09-15. */
export function byLegacyConnectionStatus(uid: string, eventType: 'connected' | 'disconnected'): WebhookMatcher {
  return (p) => p?.data?.user?.uid === uid && p?.data?.event?.type === eventType;
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

/** Campaign push-notification webhooks (after_push_notification_sent/delivered/clicked) correlate via pushNotificationId. Verified live 2026-09-10. */
export function byPushNotificationId(pushNotificationId: string): WebhookMatcher {
  return (p) => p?.data?.pushNotificationId === pushNotificationId;
}

export function and(...matchers: WebhookMatcher[]): WebhookMatcher {
  return (p) => matchers.every((m) => m(p));
}
