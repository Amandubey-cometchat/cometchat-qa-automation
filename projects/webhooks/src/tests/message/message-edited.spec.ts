import { test } from '@playwright/test';
import { sendMessage, editMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessageEdited } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('message_edited webhook fires when a message is edited, with the new text', async () => {
  const original = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('edit-me') });
  const newText = uniqueMessageText('edited');

  await editMessage(original.id, newText, QA_USER_1);

  const payload = await expectWebhookEvent('message_edited', matchers.byMessageId(original.id));

  validateMessageEdited(payload, { id: original.id, newText, oldText: original.data.text });
});
