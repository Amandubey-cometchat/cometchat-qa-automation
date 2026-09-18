import { test } from '@playwright/test';
import { establishActiveCall } from '../../triggers/calls/calls.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCallStarted } from '../../validators/calls.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { CALL_SESSION_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('call_started webhook fires once a real WebRTC call session is actually joined', async () => {
  const { signalingClient, callerSession, receiverSession, sessionId } = await establishActiveCall(QA_USER_1, QA_USER_2, 'video');
  registerCleanup(() => signalingClient.close());
  registerCleanup(() => callerSession.close());
  registerCleanup(() => receiverSession.close());

  const payload = await expectWebhookEvent('call_started', matchers.byCallMediaSessionId(sessionId), CALL_SESSION_TIMEOUT_MS);

  validateCallStarted(payload, { sessionId });
});
