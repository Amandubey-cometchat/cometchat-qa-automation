import { test } from '@playwright/test';
import { initiateCall, connectSdkClient } from '../../triggers/calls/calls.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCallRejected } from '../../validators/calls.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('call_rejected webhook fires when the receiver declines an incoming call', async () => {
  const { client: callerClient, sessionId } = await initiateCall(QA_USER_1, QA_USER_2, 'video');
  registerCleanup(() => callerClient.close());

  const receiverClient = await connectSdkClient(QA_USER_2);
  registerCleanup(() => receiverClient.close());
  await receiverClient.rejectCall(sessionId, 'rejected');

  const payload = await expectWebhookEvent('call_rejected', matchers.byCallSessionId(sessionId));

  validateCallRejected(payload, { sessionId, sender: QA_USER_1, receiver: QA_USER_2 });
});
