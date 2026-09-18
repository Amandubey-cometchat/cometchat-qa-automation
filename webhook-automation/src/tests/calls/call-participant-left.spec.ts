import { test } from '@playwright/test';
import { establishActiveCall } from '../../triggers/calls/calls.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCallParticipantLeft } from '../../validators/calls.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { CALL_SESSION_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('call_participant_left webhook fires when a participant leaves an active WebRTC session', async () => {
  const { signalingClient, callerSession, receiverSession, sessionId } = await establishActiveCall(QA_USER_1, QA_USER_2, 'video');
  registerCleanup(() => signalingClient.close());
  registerCleanup(() => callerSession.close());
  registerCleanup(() => receiverSession.close());

  // Wait for setup's own call_participant_joined webhooks to actually land
  // before resetting — otherwise their real network delay can land them
  // *after* the reset, polluting the window this test waits in next.
  // Verified live 2026-09-09: a naive reset immediately after
  // establishActiveCall() resolves races this.
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

  const payload = await expectWebhookEvent(
    'call_participant_left',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_2)),
    CALL_SESSION_TIMEOUT_MS
  );

  validateCallParticipantLeft(payload, { sessionId, uid: QA_USER_2 });
});
