/**
 * Trigger layer for GROUP webhooks: the action that actually causes
 * CometChat to fire a webhook. Thin wrappers over groups.client.ts for the
 * REST-triggerable ones; real orchestration (auth token + SDK client launch)
 * for the two that only fire from a connected client.
 */
import * as groupsClient from '../../clients/groups.client';
import { createAuthToken } from '../../clients/cometchat.client';
import { launchSdkClient, SdkClient } from '../../clients/sdk.client';

export const createGroup = groupsClient.createGroup;
export const updateGroup = groupsClient.updateGroup;
export const deleteGroup = groupsClient.deleteGroup;
export const addGroupMember = groupsClient.addGroupMembers;
export const kickGroupMember = groupsClient.kickGroupMember;
export const banGroupMember = groupsClient.banGroupMember;
export const unbanGroupMember = groupsClient.unbanGroupMember;
export const changeMemberScope = groupsClient.changeMemberScope;
export const transferGroupOwnership = groupsClient.transferGroupOwnership;

/** group_member_joined: no REST equivalent — a real SDK client must self-join. Caller is responsible for client.close(). */
export async function joinGroupSelf(uid: string, guid: string): Promise<{ client: SdkClient; hasJoined: boolean }> {
  const { authToken } = await createAuthToken(uid);
  const client = await launchSdkClient(uid, authToken);
  const { hasJoined } = await client.joinGroup(guid);
  return { client, hasJoined };
}

/** group_member_left: no REST equivalent — a real SDK client must self-leave (after first joining). Caller is responsible for client.close(). */
export async function leaveGroupSelf(uid: string, guid: string): Promise<{ client: SdkClient; hasLeft: boolean }> {
  const { authToken } = await createAuthToken(uid);
  const client = await launchSdkClient(uid, authToken);
  await client.joinGroup(guid);
  const { hasLeft } = await client.leaveGroup(guid);
  return { client, hasLeft };
}
