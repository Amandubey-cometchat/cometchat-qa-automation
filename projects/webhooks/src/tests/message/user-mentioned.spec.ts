import { test, expect } from '@playwright/test';
import { mentionUser } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateUserMentioned } from '../../validators/message.validator';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { timestampToken } from '../../utils/id-generator';

test.beforeEach(async () => {
  await resetEvents();
});

test('user_mentioned webhook fires when a message mentions a user, and message_sent also fires for the same message', async () => {
  const text = `Hi <@uid:${QA_USER_2}> check this out ${timestampToken()}`;

  const message = await mentionUser({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const mentionPayload = await expectWebhookEvent('user_mentioned', matchers.byMessageId(message.id));
  validateUserMentioned(mentionPayload, { id: message.id, text, mentionedUid: QA_USER_2 });

  // A mention doesn't replace the ordinary send event — both should fire for the same message id.
  const sentPayload = await expectWebhookEvent('message_sent', matchers.byMessageId(message.id));
  expect(sentPayload.data.message.id).toBe(String(message.id));
});
