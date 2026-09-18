import { test } from '@playwright/test';
import { connectThenDisconnect } from '../../triggers/user/user.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateLegacyConnectionStatusChanged } from '../../validators/legacy.validator';
import { QA_USER_2 } from '../../data/factories/user.factory';
import { RECEIPT_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// Only meaningful when this app's webhook config is actually switched to
// Legacy mode in the Dashboard — see scripts/test-legacy.ts. Distinct
// trigger NAME from modern user_connection_status_changed (no name
// collision), but still a structurally different payload — see
// validateLegacyConnectionStatusChanged.
test('after_connection_status_changed webhook fires', async () => {
  const { client } = await connectThenDisconnect(QA_USER_2);
  registerCleanup(() => client.close());

  const payload = await expectWebhookEvent('after_connection_status_changed', matchers.byLegacyConnectionStatus(QA_USER_2, 'disconnected'), RECEIPT_TIMEOUT_MS);

  validateLegacyConnectionStatusChanged(payload, { uid: QA_USER_2, status: 'offline', eventType: 'disconnected' });
});
