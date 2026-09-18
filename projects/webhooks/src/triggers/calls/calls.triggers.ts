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
import { launchCallSessionClient, CallSessionClient } from '../../clients/call-session.client';

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

/** A real, connected call-session client (Chat SDK + Calls SDK, fake media device) with no action taken yet. Caller is responsible for client.close(). */
export async function connectCallSession(uid: string): Promise<CallSessionClient> {
  const { authToken } = await createAuthToken(uid);
  return launchCallSessionClient(uid, authToken);
}

/**
 * Establishes a fully joined (media-session-active) 1:1 call — the real
 * precondition for call_started/call_participant_joined/call_participant_
 * left/call_ended, and for a legitimate call_busy scenario (a "busy" reject
 * only means something when the receiver is genuinely already active on a
 * call — see call-session.client.ts's rejectCall). Caller is responsible
 * for closing all 3 returned clients.
 */
export async function establishActiveCall(
  callerUid: string,
  receiverUid: string,
  callType: 'audio' | 'video' = 'video'
): Promise<{ signalingClient: SdkClient; callerSession: CallSessionClient; receiverSession: CallSessionClient; sessionId: string }> {
  const { client: signalingClient, sessionId } = await initiateCall(callerUid, receiverUid, callType);
  const [callerSession, receiverSession] = await Promise.all([connectCallSession(callerUid), connectCallSession(receiverUid)]);
  await receiverSession.acceptCall(sessionId);
  await Promise.all([callerSession.joinCallSession(sessionId), receiverSession.joinCallSession(sessionId)]);
  return { signalingClient, callerSession, receiverSession, sessionId };
}
