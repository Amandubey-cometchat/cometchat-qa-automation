import { test } from '@playwright/test';
import { establishActiveCall, initiateCall } from '../../triggers/calls/calls.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateCallBusy } from '../../validators/calls.validator';
import { QA_USER_1, QA_USER_2, QA_USER_3 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// call_busy is not automatic — confirmed live 2026-09-09: CometChat lets a
// second call to an already-busy user ring normally unless the receiving
// client itself detects it's already on a call and rejects with the BUSY
// status (mirrors a real app checking CometChat.getActiveCall() first).
test('call_busy webhook fires when the receiver explicitly rejects a second call while already on one', async () => {
  const { signalingClient, callerSession, receiverSession } = await establishActiveCall(QA_USER_1, QA_USER_2, 'video');
  registerCleanup(() => signalingClient.close());
  registerCleanup(() => callerSession.close());
  registerCleanup(() => receiverSession.close());

  await resetEvents();
  const { client: secondCaller, sessionId: secondSessionId } = await initiateCall(QA_USER_3, QA_USER_2, 'video');
  registerCleanup(() => secondCaller.close());

  await receiverSession.rejectCall(secondSessionId, 'busy');

  const payload = await expectWebhookEvent('call_busy', matchers.byCallSessionId(secondSessionId));

  validateCallBusy(payload, { sessionId: secondSessionId, sender: QA_USER_3, receiver: QA_USER_2 });
});
