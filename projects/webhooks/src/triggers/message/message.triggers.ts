/**
 * Trigger layer for MESSAGE webhooks. REST-triggerable actions wrap
 * messages.client.ts directly; markDelivered/markRead orchestrate a real SDK
 * client (no REST equivalent exists). The same two functions serve both the
 * per-recipient receipt webhooks (1:1) and the group-aggregate ones
 * (message_delivered_to_all/read_by_all) — the action is identical; which
 * webhook(s) it produces depends only on whether the receiver is a user or
 * a group with exactly one other member (verified live).
 */
import * as messagesClient from '../../clients/messages.client';
import { createAuthToken } from '../../clients/cometchat.client';
import { launchSdkClient, SdkClient } from '../../clients/sdk.client';

export const sendMessage = messagesClient.sendTextMessage;
export const editMessage = messagesClient.editMessage;
export const deleteMessage = messagesClient.deleteMessage;
export const addReaction = messagesClient.addReaction;
export const removeReaction = messagesClient.removeReaction;

/** user_mentioned fires from an ordinary sendMessage call whose text contains <@uid:...> — no separate API. */
export const mentionUser = messagesClient.sendTextMessage;

/** message_delivery_receipt / message_delivered_to_all: no REST equivalent — a real SDK client must acknowledge delivery. Caller is responsible for client.close(). */
export async function markDelivered(
  uid: string,
  messageId: string | number,
  receiverId: string,
  receiverType: 'user' | 'group',
  senderId: string
): Promise<{ client: SdkClient }> {
  const { authToken } = await createAuthToken(uid);
  const client = await launchSdkClient(uid, authToken);
  await client.markAsDelivered(messageId, receiverId, receiverType, senderId);
  return { client };
}

/** message_read_receipt / message_read_by_all: no REST equivalent. readByAll implies deliveredToAll, so this marks delivered first, same as a real client would. Caller is responsible for client.close(). */
export async function markRead(
  uid: string,
  messageId: string | number,
  receiverId: string,
  receiverType: 'user' | 'group',
  senderId: string
): Promise<{ client: SdkClient }> {
  const { authToken } = await createAuthToken(uid);
  const client = await launchSdkClient(uid, authToken);
  await client.markAsDelivered(messageId, receiverId, receiverType, senderId);
  await client.markAsRead(messageId, receiverId, receiverType, senderId);
  return { client };
}
