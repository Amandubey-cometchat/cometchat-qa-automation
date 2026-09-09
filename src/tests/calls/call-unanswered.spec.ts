import { test } from '@playwright/test';
import { initiateCall } from '../../triggers/calls/calls.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCallUnanswered } from '../../validators/calls.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { CALL_RING_TIMEOUT_SECONDS, CALL_UNANSWERED_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// Ring timeout is shortened to CALL_RING_TIMEOUT_SECONDS (5s, default is
// 45s) via initiateCall()'s timeoutSeconds arg — verified live (prod-eu,
// 2026-09-09) that the webhook still delivers well within
// CALL_UNANSWERED_TIMEOUT_MS.
test('call_unanswered webhook fires when the receiver never answers before the ring timeout', async () => {
  const { client, sessionId } = await initiateCall(QA_USER_1, QA_USER_2, 'video', CALL_RING_TIMEOUT_SECONDS);
  registerCleanup(() => client.close());

  const payload = await expectWebhookEvent('call_unanswered', matchers.byCallSessionId(sessionId), CALL_UNANSWERED_TIMEOUT_MS);

  validateCallUnanswered(payload, { sessionId, sender: QA_USER_1, receiver: QA_USER_2 });
});
