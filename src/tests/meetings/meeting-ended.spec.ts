import { test } from '@playwright/test';
import { establishMeetingSession } from '../../triggers/meetings/meetings.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMeetingEnded } from '../../validators/meetings.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { CALL_SESSION_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// meeting_ended fires once the LAST participant leaves the session — same
// mechanism as call_ended (src/tests/calls/call-ended.spec.ts), no explicit
// "end" signaling call needed since Meetings have no signaling layer at all.
test('meeting_ended webhook fires once every participant has left the session', async () => {
  const { session1, session2, sessionId } = await establishMeetingSession(QA_USER_1, QA_USER_2);
  registerCleanup(() => session1.close());
  registerCleanup(() => session2.close());

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
  // Wait for the first leave's own webhook before triggering the second —
  // sending both back-to-back with no confirmation in between was
  // confirmed live (for Calls) to sometimes make CometChat's backend miss
  // firing the "ended" event altogether, not just a delivery-timing issue.
  await expectWebhookEvent(
    'meeting_participant_left',
    matchers.and(matchers.byCallMediaSessionId(sessionId), matchers.byCallOccupantUid(QA_USER_2)),
    CALL_SESSION_TIMEOUT_MS
  );
  await session1.leaveCallSession();

  const payload = await expectWebhookEvent('meeting_ended', matchers.byCallMediaSessionId(sessionId), CALL_SESSION_TIMEOUT_MS);

  validateMeetingEnded(payload, { sessionId, participantUids: [QA_USER_1, QA_USER_2] });
});
