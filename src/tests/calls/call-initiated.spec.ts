import { test } from '@playwright/test';
import { initiateCall } from '../../triggers/calls/calls.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCallInitiated } from '../../validators/calls.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('call_initiated webhook fires when a real SDK session places an outgoing call', async () => {
  const { client, sessionId } = await initiateCall(QA_USER_1, QA_USER_2, 'video');
  // Cleanups run LIFO (see utils/cleanup.ts) — register close() first so the
  // cancel (registered second) runs before logout, not after.
  registerCleanup(() => client.close());
  registerCleanup(() => client.rejectCall(sessionId, 'cancelled').catch(() => {}));

  const payload = await expectWebhookEvent('call_initiated', matchers.byCallSessionId(sessionId));

  validateCallInitiated(payload, { sessionId, sender: QA_USER_1, receiver: QA_USER_2 });
});
