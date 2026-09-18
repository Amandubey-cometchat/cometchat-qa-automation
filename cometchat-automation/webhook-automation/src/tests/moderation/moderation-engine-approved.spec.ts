import { test } from '@playwright/test';
import { sendCleanContent } from '../../triggers/moderation/moderation.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateModerationApproved } from '../../validators/moderation.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

// Live-verified 2026-09-06 against prod-eu: an ordinary message fires both
// moderation_engine_approved and message_sent for the same message id.
test('moderation_engine_approved webhook fires when a clean message clears moderation', async () => {
  const message = await sendCleanContent({ sender: QA_USER_1, receiver: QA_USER_2 });

  const payload = await expectWebhookEvent('moderation_engine_approved', matchers.byMessageId(message.id));

  validateModerationApproved(payload, { id: message.id, sender: QA_USER_1, receiver: QA_USER_2, text: message.data.text });
});
