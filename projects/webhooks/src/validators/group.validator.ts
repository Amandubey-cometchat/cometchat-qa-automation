import { expect } from '@playwright/test';
import { ReceivedWebhookPayload } from '../webhook/webhook.waiter';
import { validateEnvelope } from './common.validator';

export function validateGroupCreated(payload: ReceivedWebhookPayload, expected: { guid: string; name: string; owner: string; createdAt?: number }) {
  validateEnvelope(payload, 'group_created');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.group.name).toBe(expected.name);
  expect(payload.data.group.type).toBe('public');
  expect(payload.data.group.owner).toBe(expected.owner);
  if (expected.createdAt !== undefined) expect(payload.data.group.createdAt).toBe(expected.createdAt);
}

export function validateGroupUpdated(payload: ReceivedWebhookPayload, expected: { guid: string; newName: string; oldName: string }) {
  validateEnvelope(payload, 'group_updated');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.group.name).toBe(expected.newName);
  expect(payload.data.group.name).not.toBe(expected.oldName);
}

export function validateGroupDeleted(payload: ReceivedWebhookPayload, expected: { guid: string }) {
  validateEnvelope(payload, 'group_deleted');
  expect(payload.data.group.guid).toBe(expected.guid);
}

export function validateGroupMemberAdded(payload: ReceivedWebhookPayload, expected: { guid: string; member: string; actor: string }) {
  validateEnvelope(payload, 'group_member_added');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.members).toHaveProperty(expected.member);
  expect(payload.data.by.uid).toBe(expected.actor);
}

export function validateGroupMemberKicked(payload: ReceivedWebhookPayload, expected: { guid: string; member: string; actor: string }) {
  validateEnvelope(payload, 'group_member_kicked');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.members).toHaveProperty(expected.member);
  expect(payload.data.by.uid).toBe(expected.actor);
}

export function validateGroupMemberBanned(payload: ReceivedWebhookPayload, expected: { guid: string; member: string; actor: string }) {
  validateEnvelope(payload, 'group_member_banned');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.members).toHaveProperty(expected.member);
  expect(payload.data.by.uid).toBe(expected.actor);
}

export function validateGroupMemberUnbanned(payload: ReceivedWebhookPayload, expected: { guid: string; member: string; actor: string }) {
  validateEnvelope(payload, 'group_member_unbanned');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.members).toHaveProperty(expected.member);
  expect(payload.data.by.uid).toBe(expected.actor);
}

export function validateGroupMemberScopeChanged(payload: ReceivedWebhookPayload, expected: { guid: string; member: string; newScope: string; oldScope: string; actor: string }) {
  validateEnvelope(payload, 'group_member_scope_changed');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.members[expected.member].scope).toBe(expected.newScope);
  expect(payload.data.members[expected.member].oldScope).toBe(expected.oldScope);
  expect(payload.data.by.uid).toBe(expected.actor);
}

export function validateGroupOwnerTransferred(payload: ReceivedWebhookPayload, expected: { guid: string; newOwner: string; oldOwner: string }) {
  validateEnvelope(payload, 'group_owner_transferred');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.group.owner).toBe(expected.newOwner);
  expect(payload.data.group.oldOwner).toBe(expected.oldOwner);
}

export function validateGroupMemberJoined(payload: ReceivedWebhookPayload, expected: { guid: string; owner: string; member: string }) {
  validateEnvelope(payload, 'group_member_joined');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.group.owner).toBe(expected.owner);
  expect(payload.data.members).toHaveProperty(expected.member);
  expect(payload.data.members[expected.member].uid).toBe(expected.member);
}

export function validateGroupMemberLeft(payload: ReceivedWebhookPayload, expected: { guid: string; member: string }) {
  validateEnvelope(payload, 'group_member_left');
  expect(payload.data.group.guid).toBe(expected.guid);
  expect(payload.data.members).toHaveProperty(expected.member);
  expect(payload.data.members[expected.member].uid).toBe(expected.member);
}
