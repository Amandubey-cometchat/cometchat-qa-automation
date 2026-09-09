import { test } from '@playwright/test';
import { establishActiveCall } from '../../triggers/calls/calls.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCallEnded } from '../../validators/calls.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { CALL_SESSION_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// call_ended fires once the LAST participant leaves the media session —
// verified live 2026-09-09: no explicit CometChat.endCall() signaling call
// is needed, the session ending itself is what triggers it.
test('call_ended webhook fires once every participant has left the WebRTC session', async () => {
  const { signalingClient, callerSession, receiverSession, sessionId } = await establishActiveCall(QA_USER_1, QA_USER_2, 'video');
  registerCleanup(() => signalingClient.close());
  registerCleanup(() => callerSession.close());
  registerCleanup(() => receiverSession.close());

  // Wait for setup's own call_participant_joined webhooks to actually land
  // before resetting — same real-network-delay race as
  // call-participant-left.spec.ts.
  await expectWebhookEvent(
    'call_participant_joined',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_1)),
    CALL_SESSION_TIMEOUT_MS
  );
  await expectWebhookEvent(
    'call_participant_joined',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_2)),
    CALL_SESSION_TIMEOUT_MS
  );

  await resetEvents();
  await receiverSession.leaveCallSession();
  // Wait for the first leave's own webhook before triggering the second —
  // sending both leaves back-to-back with no confirmation in between was
  // confirmed live 2026-09-09 to sometimes make CometChat's backend miss
  // firing call_ended altogether (a participant-count race), not just a
  // delivery-timing issue.
  await expectWebhookEvent(
    'call_participant_left',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_2)),
    CALL_SESSION_TIMEOUT_MS
  );
  await callerSession.leaveCallSession();

  const payload = await expectWebhookEvent('call_ended', matchers.byCallMediaSessionId(sessionId), CALL_SESSION_TIMEOUT_MS);

  validateCallEnded(payload, { sessionId, participantUids: [QA_USER_1, QA_USER_2] });
});
