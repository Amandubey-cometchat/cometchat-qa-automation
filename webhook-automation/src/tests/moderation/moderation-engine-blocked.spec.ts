import { test } from '@playwright/test';
import { sendFlaggedContent } from '../../triggers/moderation/moderation.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateModerationBlocked } from '../../validators/moderation.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

// Live-verified 2026-09-06 against prod-eu: the active rule is a "Profanity
// filter" (data.message.data.moderation.rule.id === "profanity-filter"),
// confirmed via the real webhook payload naming the rule and its full
// flagged-word list. A phone-number pattern does NOT trigger this app's
// moderation at all — that's a different rule this app doesn't have active.
test('moderation_engine_blocked webhook fires when a message matches the Profanity filter', async () => {
  const message = await sendFlaggedContent({ sender: QA_USER_1, receiver: QA_USER_2 });

  const payload = await expectWebhookEvent('moderation_engine_blocked', matchers.byMessageId(message.id));

  validateModerationBlocked(payload, { id: message.id, sender: QA_USER_1, receiver: QA_USER_2, text: message.data.text });
});
