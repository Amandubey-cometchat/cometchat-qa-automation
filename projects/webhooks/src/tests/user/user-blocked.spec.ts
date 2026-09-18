import { test } from '@playwright/test';
import { blockUser, unblockUser } from '../../triggers/user/user.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateUserBlocked } from '../../validators/user.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('user_blocked webhook fires with the correct blocker and blocked user', async () => {
  await blockUser(QA_USER_1, QA_USER_2);

  const payload = await expectWebhookEvent('user_blocked', matchers.byBlockerUid(QA_USER_1));

  validateUserBlocked(payload, { blocker: QA_USER_1, blocked: QA_USER_2 });

  await unblockUser(QA_USER_1, QA_USER_2); // leave state clean for other tests
});
