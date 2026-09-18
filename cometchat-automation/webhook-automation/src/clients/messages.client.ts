import { apiRequest } from './cometchat.client';

export interface SendTextMessageOptions {
  sender?: string;
  receiver: string;
  receiverType?: 'user' | 'group';
  text: string;
}

export async function sendTextMessage({ sender, receiver, receiverType = 'user', text }: SendTextMessageOptions) {
  // onBehalfOf makes CometChat attribute the message to the real sender UID
  // instead of the app_system service account — verified live: without it,
  // payload.data.message.sender comes back as "app_system" regardless of
  // who you pass as `receiver`/`sender` in the body.
  //
  // Deliberately REST, not SDK: message_sent does not fire at all for
  // messages sent through the SDK's real-time path — confirmed live via
  // both a UIKit send and a raw CometChat.sendMessage() call, so it's not
  // UI-specific. REST is the only way this webhook fires.
  return apiRequest(
    'POST',
    '/messages',
    { category: 'message', type: 'text', data: { text }, receiver, receiverType },
    sender ? { onBehalfOf: sender } : undefined
  );
}

export async function editMessage(messageId: string | number, text: string, onBehalfOf?: string) {
  return apiRequest('PUT', `/messages/${messageId}`, { data: { text } }, onBehalfOf ? { onBehalfOf } : undefined);
}

export async function deleteMessage(messageId: string | number, onBehalfOf?: string) {
  return apiRequest('DELETE', `/messages/${messageId}`, undefined, onBehalfOf ? { onBehalfOf } : undefined);
}

export async function addReaction(messageId: string | number, reaction: string, onBehalfOf: string) {
  return apiRequest('POST', `/messages/${messageId}/reactions/${encodeURIComponent(reaction)}`, undefined, { onBehalfOf });
}

export async function removeReaction(messageId: string | number, reaction: string, onBehalfOf: string) {
  return apiRequest('DELETE', `/messages/${messageId}/reactions/${encodeURIComponent(reaction)}`, undefined, { onBehalfOf });
}

/**
 * Live-verified 2026-09-12 against staging-us: POST /messages/{id}/pin fires
 * message_pinned for real (not documented as a flat REST path anywhere
 * public at the time this project last checked — see
 * src/registry/message.registry.ts's prior 2026-09-04 finding, which this
 * supersedes). No request body; onBehalfOf attributes the pin the same way
 * every other action in this client does.
 */
export async function pinMessage(messageId: string | number, onBehalfOf: string) {
  return apiRequest('POST', `/messages/${messageId}/pin`, undefined, { onBehalfOf });
}

/** Live-verified 2026-09-12 against staging-us: DELETE /messages/{id}/pin fires message_unpinned for real. */
export async function unpinMessage(messageId: string | number, onBehalfOf: string) {
  return apiRequest('DELETE', `/messages/${messageId}/pin`, undefined, { onBehalfOf });
}
