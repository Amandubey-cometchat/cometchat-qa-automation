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

/** Calls webhooks correlate via sessionId (unique per call attempt), not message id — verified live 2026-09-09. */
export function byCallSessionId(sessionId: string): WebhookMatcher {
  return (p) => p?.data?.call?.data?.entities?.on?.entity?.sessionid === sessionId;
}

export function and(...matchers: WebhookMatcher[]): WebhookMatcher {
  return (p) => matchers.every((m) => m(p));
}
