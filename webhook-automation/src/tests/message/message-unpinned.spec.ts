import { test } from '../webhook-guard.fixture';
import { sendMessage, pinMessage, unpinMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessageUnpinned } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('message_unpinned webhook fires when a message is unpinned', async () => {
  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('unpin-me') });
  // CometChat caps pinned messages per conversation at 5. Without this,
  // any failure between pin and unpin leaks a pin against that cap, and
  // enough leaked runs wedge the whole conversation with
  // ERR_PINNED_MESSAGES_LIMIT_EXCEEDED — which is exactly what happened on
  // prod-us (2026-09-16) and took a manual sweep to clear.
  registerCleanup(() => unpinMessage(message.id, QA_USER_1).catch(() => {}));
  await pinMessage(message.id, QA_USER_1);

  await unpinMessage(message.id, QA_USER_1);

  const payload = await expectWebhookEvent('message_unpinned', matchers.byMessageId(message.id));

  validateMessageUnpinned(payload, { id: message.id, unpinnedBy: QA_USER_1 });
});
