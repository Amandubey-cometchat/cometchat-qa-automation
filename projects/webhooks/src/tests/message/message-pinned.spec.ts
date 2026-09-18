import { test } from '@playwright/test';
import { sendMessage, pinMessage, unpinMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessagePinned } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('message_pinned webhook fires when a message is pinned', async () => {
  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('pin-me') });
  // Unpin in cleanup rather than leaving it pinned — CometChat caps pinned
  // messages per conversation (ERR_PINNED_MESSAGES_LIMIT_EXCEEDED), so
  // repeated runs against the same fixed QA users would eventually fail.
  registerCleanup(() => unpinMessage(message.id, QA_USER_1).catch(() => {}));

  await pinMessage(message.id, QA_USER_1);

  const payload = await expectWebhookEvent('message_pinned', matchers.byMessageId(message.id));

  validateMessagePinned(payload, { id: message.id, pinnedBy: QA_USER_1 });
});
