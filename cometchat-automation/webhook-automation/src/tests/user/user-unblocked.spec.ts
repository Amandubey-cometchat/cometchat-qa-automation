import { test } from '@playwright/test';
import { blockUser, unblockUser } from '../../triggers/user/user.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateUserUnblocked } from '../../validators/user.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('user_unblocked webhook fires with the correct unblocker and unblocked user', async () => {
  await blockUser(QA_USER_1, QA_USER_2);
  await resetEvents(); // isolate from the user_blocked event above

  await unblockUser(QA_USER_1, QA_USER_2);

  const payload = await expectWebhookEvent('user_unblocked', matchers.byBlockerUid(QA_USER_1));

  validateUserUnblocked(payload, { unblocker: QA_USER_1, unblocked: QA_USER_2 });
});
