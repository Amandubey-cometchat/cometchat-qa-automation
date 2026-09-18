import { test } from '@playwright/test';
import { establishMeetingSession } from '../../triggers/meetings/meetings.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMeetingParticipantLeft } from '../../validators/meetings.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { CALL_SESSION_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('meeting_participant_left webhook fires when a participant leaves an active session', async () => {
  const { session1, session2, sessionId } = await establishMeetingSession(QA_USER_1, QA_USER_2);
  registerCleanup(() => session1.close());
  registerCleanup(() => session2.close());

  // Wait for setup's own call_participant_joined webhooks to actually land
  // before resetting — same real-network-delay race found and fixed for
  // Calls (src/tests/calls/call-participant-left.spec.ts).
  await expectWebhookEvent(
    'meeting_participant_joined',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_1)),
    CALL_SESSION_TIMEOUT_MS
  );
  await expectWebhookEvent(
    'meeting_participant_joined',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_2)),
    CALL_SESSION_TIMEOUT_MS
  );

  await resetEvents();
  await session2.leaveCallSession();

  const payload = await expectWebhookEvent(
    'meeting_participant_left',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_2)),
    CALL_SESSION_TIMEOUT_MS
  );

  validateMeetingParticipantLeft(payload, { sessionId, uid: QA_USER_2 });
});
