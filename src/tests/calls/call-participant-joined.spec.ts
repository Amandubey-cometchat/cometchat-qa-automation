import { test } from '@playwright/test';
import { establishActiveCall } from '../../triggers/calls/calls.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCallParticipantJoined } from '../../validators/calls.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { CALL_SESSION_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// Fires once per participant (2 events for a 1:1 call) — this test checks
// the receiver's specific join, not an exhaustive count of both.
test('call_participant_joined webhook fires for each participant that joins the WebRTC session', async () => {
  const { signalingClient, callerSession, receiverSession, sessionId } = await establishActiveCall(QA_USER_1, QA_USER_2, 'video');
  registerCleanup(() => signalingClient.close());
  registerCleanup(() => callerSession.close());
  registerCleanup(() => receiverSession.close());

  const payload = await expectWebhookEvent(
    'call_participant_joined',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_2)),
    CALL_SESSION_TIMEOUT_MS
  );

  validateCallParticipantJoined(payload, { sessionId, uid: QA_USER_2 });
});
