/**
 * Trigger layer for USER webhooks. block/unblock wrap users.client.ts
 * directly; connectDisconnect orchestrates a real SDK client (no REST
 * equivalent for user_connection_status_changed).
 */
import * as usersClient from '../../clients/users.client';
import { createAuthToken } from '../../clients/cometchat.client';
import { launchSdkClient, SdkClient } from '../../clients/sdk.client';

export const blockUser = usersClient.blockUser;
export const unblockUser = usersClient.unblockUser;

/** user_connection_status_changed: connects a real SDK client then disconnects it. Caller is responsible for client.close(). */
export async function connectThenDisconnect(uid: string): Promise<{ client: SdkClient }> {
  const { authToken } = await createAuthToken(uid);
  const client = await launchSdkClient(uid, authToken);
  await client.disconnect();
  return { client };
}
