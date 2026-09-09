/**
 * Trigger layer for CALLS webhooks: real Chat SDK call signaling (initiate/
 * accept/reject/cancel) via a real, connected browser session — there is no
 * REST endpoint to initiate a call. The Calls REST API
 * (https://{appId}.call-{region}.cometchat.io/v3) is read-only: List/Get
 * call logs only. Verified live 2026-09-09 against
 * /docs/rest-api/calls-apis/overview. See src/clients/sdk.client.ts for the
 * underlying SDK session.
 */
import { createAuthToken } from '../../clients/cometchat.client';
import { launchSdkClient, SdkClient } from '../../clients/sdk.client';

/** A real, connected SDK session with no action taken yet — used as the receiver side of a call signaling test. Caller is responsible for client.close(). */
export async function connectSdkClient(uid: string): Promise<SdkClient> {
  const { authToken } = await createAuthToken(uid);
  return launchSdkClient(uid, authToken);
}

/**
 * call_initiated (and the starting point for call_unanswered/call_cancelled/
 * call_rejected — see the returned client's acceptCall/rejectCall). Caller
 * is responsible for client.close().
 */
export async function initiateCall(
  uid: string,
  receiverUid: string,
  callType: 'audio' | 'video' = 'video',
  timeoutSeconds?: number
): Promise<{ client: SdkClient; sessionId: string }> {
  const client = await connectSdkClient(uid);
  const { sessionId } = await client.initiateCall(receiverUid, callType, timeoutSeconds);
  return { client, sessionId };
}
