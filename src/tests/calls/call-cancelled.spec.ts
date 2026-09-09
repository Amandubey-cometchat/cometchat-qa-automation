import { test } from '@playwright/test';
import { initiateCall } from '../../triggers/calls/calls.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCallCancelled } from '../../validators/calls.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('call_cancelled webhook fires when the initiator cancels before the receiver answers', async () => {
  const { client, sessionId } = await initiateCall(QA_USER_1, QA_USER_2, 'video');
  registerCleanup(() => client.close());

  await client.rejectCall(sessionId, 'cancelled');

  const payload = await expectWebhookEvent('call_cancelled', matchers.byCallSessionId(sessionId));

  validateCallCancelled(payload, { sessionId, sender: QA_USER_1, receiver: QA_USER_2 });
});
