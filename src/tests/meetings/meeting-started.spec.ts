import { test } from '@playwright/test';
import { establishMeetingSession } from '../../triggers/meetings/meetings.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMeetingStarted } from '../../validators/meetings.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { CALL_SESSION_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('meeting_started webhook fires when two sessions join the same session ID directly (no ringing)', async () => {
  const { session1, session2, sessionId } = await establishMeetingSession(QA_USER_1, QA_USER_2);
  registerCleanup(() => session1.close());
  registerCleanup(() => session2.close());

  const payload = await expectWebhookEvent('meeting_started', matchers.byCallMediaSessionId(sessionId), CALL_SESSION_TIMEOUT_MS);

  validateMeetingStarted(payload, { sessionId });
});
