import { apiRequest } from './cometchat.client';

export interface CreateGroupOptions {
  guid: string;
  name: string;
  type?: 'public' | 'private' | 'password';
  onBehalfOf?: string;
}

export async function createGroup({ guid, name, type = 'public', onBehalfOf }: CreateGroupOptions) {
  return apiRequest('POST', '/groups', { guid, name, type }, onBehalfOf ? { onBehalfOf } : undefined);
}

export async function updateGroup(guid: string, updates: Record<string, unknown>, onBehalfOf?: string) {
  return apiRequest('PUT', `/groups/${guid}`, updates, onBehalfOf ? { onBehalfOf } : undefined);
}

export async function deleteGroup(guid: string, onBehalfOf?: string) {
  return apiRequest('DELETE', `/groups/${guid}`, undefined, onBehalfOf ? { onBehalfOf } : undefined);
}

export interface AddGroupMembersOptions {
  admins?: string[];
  moderators?: string[];
  participants?: string[];
  onBehalfOf?: string;
}

export async function addGroupMembers(guid: string, { admins, moderators, participants, onBehalfOf }: AddGroupMembersOptions = {}) {
  const body: Record<string, unknown> = {};
  if (admins) body.admins = admins;
  if (moderators) body.moderators = moderators;
  if (participants) body.participants = participants;
  return apiRequest('POST', `/groups/${guid}/members`, body, onBehalfOf ? { onBehalfOf } : undefined);
}

export async function kickGroupMember(guid: string, uid: string, onBehalfOf?: string) {
  return apiRequest('DELETE', `/groups/${guid}/members/${uid}`, undefined, onBehalfOf ? { onBehalfOf } : undefined);
}

export async function changeMemberScope(guid: string, uid: string, scope: string, onBehalfOf?: string) {
  return apiRequest('PUT', `/groups/${guid}/members/${uid}`, { scope }, onBehalfOf ? { onBehalfOf } : undefined);
}

// Deliberately no onBehalfOf parameter — CometChat's Update Group API docs
// state the `owner` field is silently ignored whenever onBehalfOf is present
// on the request. Confirmed live: passing both fires group_updated instead
// of group_owner_transferred, because the ownership change never happens.
export async function transferGroupOwnership(guid: string, newOwnerUid: string) {
  return apiRequest('PUT', `/groups/${guid}`, { owner: newOwnerUid });
}

export async function banGroupMember(guid: string, uid: string, onBehalfOf?: string) {
  return apiRequest('POST', `/groups/${guid}/bannedusers/${uid}`, undefined, onBehalfOf ? { onBehalfOf } : undefined);
}

export async function unbanGroupMember(guid: string, uid: string, onBehalfOf?: string) {
  return apiRequest('DELETE', `/groups/${guid}/bannedusers/${uid}`, undefined, onBehalfOf ? { onBehalfOf } : undefined);
}

export async function getGroup(guid: string) {
  return apiRequest('GET', `/groups/${guid}`);
}

/** Used by scripts/cleanup.ts to sweep up stray test groups left behind by a failed/interrupted run. */
export async function searchGroups(searchTerm: string, limit = 100) {
  return apiRequest('GET', `/groups?search=${encodeURIComponent(searchTerm)}&limit=${limit}`);
}
