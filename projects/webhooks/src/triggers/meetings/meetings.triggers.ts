/**
 * Trigger layer for MEETINGS webhooks. Unlike Calls, Meetings use CometChat's
 * "Call Sessions" — participants join a session directly via a session ID,
 * with no ringing/signaling step at all (no initiateCall/acceptCall).
 * Confirmed live 2026-09-09 against prod-eu: two sessions joining an
 * arbitrary session ID (via connectCallSession + joinCallSession, see
 * src/clients/call-session.client.ts) fired meeting_started and
 * meeting_participant_joined immediately, with no signaling of any kind.
 *
 * Cross-checked against CometChat's own docs (/docs/calls/webhooks-call-session)
 * and against a real production request the user captured: their app sends a
 * group message (category "custom", type "meeting", session ID in
 * customData) as its own invite/UI layer — that message is not what fires
 * these webhooks, joining the session directly is, so it's not replicated
 * here.
 */
import { connectCallSession } from '../calls/calls.triggers';
import { CallSessionClient } from '../../clients/call-session.client';
import { getConfig } from '../../config/env';

function uniqueMeetingSessionId(): string {
  return `qa-meeting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Two real sessions joining the same arbitrary session ID directly — the
 * precondition for all 4 automated Meetings webhooks. Caller is
 * responsible for closing both sessions.
 *
 * The returned `sessionId` is the CometChat-resolved one
 * (`v1.<region>.<appId>.<rawId>`), not the raw id passed to joinSession —
 * confirmed live 2026-09-09 that CometChat prefixes any arbitrary session
 * id this way, and every webhook payload's data.sessionId carries the
 * prefixed form. For Calls, the equivalent sessionId comes back
 * pre-prefixed from CometChat's own initiateCall() response; Meetings has
 * no such call, so it has to be reconstructed here to match.
 */
export async function establishMeetingSession(
  uid1: string,
  uid2: string
): Promise<{ session1: CallSessionClient; session2: CallSessionClient; sessionId: string }> {
  const rawSessionId = uniqueMeetingSessionId();
  const { region, appId } = getConfig();
  const sessionId = `v1.${region}.${appId}.${rawSessionId}`;

  const [session1, session2] = await Promise.all([connectCallSession(uid1), connectCallSession(uid2)]);
  await Promise.all([session1.joinCallSession(rawSessionId), session2.joinCallSession(rawSessionId)]);
  return { session1, session2, sessionId };
}
