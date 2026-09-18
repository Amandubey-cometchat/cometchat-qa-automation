import { test, allowMultiple } from '../webhook-guard.fixture';
import { sendMessage, deleteMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, assertNoWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessageDeleted } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { EDIT_SIDE_EFFECT_WINDOW_MS } from '../../utils/timeout';

test.beforeEach(async () => {
  await resetEvents();
});

test('message_deleted webhook fires when a message is deleted', async () => {
  allowMultiple('message_sent', 'KNOWN COMETCHAT BUG: deleting fires an extra message_sent for an auto-generated category:action / data.action:"deleted" message. Tracked by the dedicated known-bug test in message-edited.spec.ts (same defect class, verified live 2026-09-16).');
  allowMultiple('push-notification-payload-generated', 'Two distinct actions in this test (send, then delete), and push fires for both per CometChat docs.');

  const original = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('delete-me') });

  await deleteMessage(original.id, QA_USER_1);

  const payload = await expectWebhookEvent('message_deleted', matchers.byMessageId(original.id));

  validateMessageDeleted(payload, { id: original.id });
});

test('deleting a message fires no extra message_sent webhook', async () => {
  // KNOWN COMETCHAT BUG (reproduced live 2026-09-16, prod-us): deleting a
  // message auto-creates an "action" message (category: "action", type:
  // "message", data.action: "deleted") with a fresh id, which fires its own
  // message_sent. Observed id 5270 for deleted message 5269.
  //
  // Milder than the edit case (message-edited.spec.ts), which fires THREE
  // such action messages including an exact duplicate routing pair — one
  // per mutation is at least self-consistent. Still means anything counting
  // message_sent as "a user sent something" over-counts every deletion.
  //
  // Asserts the correct behaviour (zero) so it self-heals if CometChat
  // fixes it — same convention as group-member-banned/unbanned.
  test.fail(true, 'CometChat webhook bug: deleting a message fires an extra message_sent for an auto-generated "deleted" action message');

  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('delete-side-effects') });
  await expectWebhookEvent('message_sent', matchers.byMessageId(message.id));

  await resetEvents();
  await deleteMessage(message.id, QA_USER_1);

  await assertNoWebhookEvent('message_sent', matchers.byActionMessage('deleted'), EDIT_SIDE_EFFECT_WINDOW_MS);
});
