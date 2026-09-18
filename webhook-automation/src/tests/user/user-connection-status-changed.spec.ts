import { test } from '@playwright/test';
import { connectThenDisconnect } from '../../triggers/user/user.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateConnectionStatusChanged } from '../../validators/user.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';
import { RECEIPT_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('user_connection_status_changed webhook fires when a client disconnects', async () => {
  const { client } = await connectThenDisconnect(QA_USER_2);
  registerCleanup(() => client.close());

  // Matched on uid + "disconnected" specifically — this trigger fires
  // ambiently for any client connecting to the app (verified live: an
  // unrelated "Guest User"/uikit session showed up in the same window), so a
  // loose matcher would give a false positive from unrelated traffic.
  const payload = await expectWebhookEvent(
    'user_connection_status_changed',
    matchers.byUserConnectionStatus(QA_USER_2, 'disconnected'),
    RECEIPT_TIMEOUT_MS
  );

  validateConnectionStatusChanged(payload, { uid: QA_USER_2, status: 'offline', action: 'disconnected' });
});
