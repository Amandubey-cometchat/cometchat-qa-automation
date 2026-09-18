import { test } from '../webhook-guard.fixture';
import { sendMessage, editMessage } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, assertNoWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateMessageEdited } from '../../validators/message.validator';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { EDIT_SIDE_EFFECT_WINDOW_MS } from '../../utils/timeout';

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

test('editing a message fires no extra message_sent webhooks', async () => {
  // KNOWN COMETCHAT BUG (reproduced live 2026-09-16, prod-us): a single
  // edit generates THREE auto-created "action" messages (category:
  // "action", type: "message", data.action: "edited") with fresh message
  // ids, and each one fires its own message_sent webhook — on top of the
  // expected message_edited. Observed ids 4813/4814/4815 for one edit:
  //   4813 sender=uid-1 receiver=uid-2   (immediately, ~80ms after edit)
  //   4814 sender=uid-1 receiver=uid-1   (~3.5s later, addressed to self)
  //   4815 sender=uid-1 receiver=uid-2   (~3.5s later, same routing as 4813)
  // So 4813 and 4815 are a genuine duplicate pair, and 4814 is addressed
  // back to the sender. Anything consuming message_sent to count real user
  // sends will triple-count every edit.
  //
  // This is why the check is scoped to byActionMessage('edited') rather
  // than any message_sent: these apps carry concurrent background traffic,
  // and a permissive matcher would false-positive on unrelated sends.
  //
  // Asserting the CORRECT behaviour (zero) rather than the buggy count, so
  // this starts passing by itself if CometChat ever fixes it — same
  // convention as group-member-banned/unbanned's known-bug tests.
  test.fail(true, 'CometChat webhook bug: editing a message fires 3 extra message_sent webhooks for auto-generated "edited" action messages');

  const original = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: uniqueMessageText('edit-side-effects') });
  await expectWebhookEvent('message_sent', matchers.byMessageId(original.id));

  // Clear the send's own webhooks so only the edit's side effects are in scope.
  await resetEvents();
  await editMessage(original.id, uniqueMessageText('edited-side-effects'), QA_USER_1);

  await assertNoWebhookEvent('message_sent', matchers.byActionMessage('edited'), EDIT_SIDE_EFFECT_WINDOW_MS);
});
