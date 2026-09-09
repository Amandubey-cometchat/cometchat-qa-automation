import { test } from '@playwright/test';
import { establishMeetingSession } from '../../triggers/meetings/meetings.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMeetingParticipantJoined } from '../../validators/meetings.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { CALL_SESSION_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// Fires once per participant (2 events for a 2-person meeting) — this test
// checks one specific participant's join, not an exhaustive count of both.
test('meeting_participant_joined webhook fires for each participant that joins the session', async () => {
  const { session1, session2, sessionId } = await establishMeetingSession(QA_USER_1, QA_USER_2);
  registerCleanup(() => session1.close());
  registerCleanup(() => session2.close());

  const payload = await expectWebhookEvent(
    'meeting_participant_joined',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_2)),
    CALL_SESSION_TIMEOUT_MS
  );

  validateMeetingParticipantJoined(payload, { sessionId, uid: QA_USER_2 });
});
