import { expect } from '@playwright/test';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';
import { validateEnvelope, validateDeliveryMechanics } from './common.validator';

export function validateMessageSent(payload: ReceivedWebhookPayload, expected: { id: string | number; sender: string; receiver: string; receiverType: 'user' | 'group'; text: string }) {
  validateEnvelope(payload, 'message_sent');
  expect(payload.data.message.id).toBe(String(expected.id));
  expect(payload.data.message.sender).toBe(expected.sender);
  expect(payload.data.message.receiver).toBe(expected.receiver);
  expect(payload.data.message.receiverType).toBe(expected.receiverType);
  expect(payload.data.message.category).toBe('message');
  expect(payload.data.message.type).toBe('text');
  expect(payload.data.message.data.text).toBe(expected.text);
  expect(typeof payload.data.message.sentAt).toBe('number');
  validateDeliveryMechanics(payload);
}

export function validateMessageEdited(payload: ReceivedWebhookPayload, expected: { id: string | number; newText: string; oldText: string }) {
  validateEnvelope(payload, 'message_edited');
  expect(payload.data.message.id).toBe(String(expected.id));
  expect(payload.data.message.data.text).toBe(expected.newText);
  expect(payload.data.message.data.text).not.toBe(expected.oldText);
}

export function validateMessageDeleted(payload: ReceivedWebhookPayload, expected: { id: string | number }) {
  validateEnvelope(payload, 'message_deleted');
  expect(payload.data.message.id).toBe(String(expected.id));
}

export function validateMessageReactionAdded(payload: ReceivedWebhookPayload, expected: { messageId: string | number; reaction: string; reactor: string }) {
  validateEnvelope(payload, 'message_reaction_added');
  expect(payload.data.reaction.messageId).toBe(String(expected.messageId));
  expect(payload.data.reaction.reaction).toBe(expected.reaction);
  expect(payload.data.reaction.reactedBy.uid).toBe(expected.reactor);
}

export function validateMessageReactionRemoved(payload: ReceivedWebhookPayload, expected: { messageId: string | number; reaction: string; reactor: string }) {
  validateEnvelope(payload, 'message_reaction_removed');
  expect(payload.data.reaction.messageId).toBe(String(expected.messageId));
  expect(payload.data.reaction.reaction).toBe(expected.reaction);
  expect(payload.data.reaction.reactedBy.uid).toBe(expected.reactor);
}

export function validateUserMentioned(payload: ReceivedWebhookPayload, expected: { id: string | number; text: string; mentionedUid: string }) {
  validateEnvelope(payload, 'user_mentioned');
  expect(payload.data.message.id).toBe(String(expected.id));
  expect(payload.data.message.data.text).toBe(expected.text);
  expect(payload.data.message.data.mentions).toHaveProperty(expected.mentionedUid);
}

export function validateReceipt(payload: ReceivedWebhookPayload, expected: { trigger: 'message_delivery_receipt' | 'message_read_receipt'; action: 'delivered' | 'read'; messageId: string | number; recipient: string; sender: string }) {
  validateEnvelope(payload, expected.trigger);
  expect(payload.data.body.action).toBe(expected.action);
  expect(payload.data.body.messageId).toBe(String(expected.messageId));
  expect(payload.data.body.user.uid).toBe(expected.recipient);
  expect(payload.data.sender).toBe(expected.recipient);
  expect(payload.data.messageSender).toBe(expected.sender);
}

export function validateAggregateReceipt(payload: ReceivedWebhookPayload, expected: { trigger: 'message_delivered_to_all' | 'message_read_by_all'; action: 'deliveredToAll' | 'readByAll'; messageId: string | number; guid: string; sender: string }) {
  validateEnvelope(payload, expected.trigger);
  expect(payload.data.receiver).toBe(expected.guid);
  expect(payload.data.receiverType).toBe('group');
  expect(payload.data.messageSender).toBe(expected.sender);
  expect(payload.data.body.action).toBe(expected.action);
  expect(payload.data.body.messageId).toBe(String(expected.messageId));
}
