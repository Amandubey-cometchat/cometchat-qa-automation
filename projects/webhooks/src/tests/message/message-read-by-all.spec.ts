import { test } from '@playwright/test';
import { createGroup, deleteGroup, addGroupMember } from '../../triggers/group/group.triggers';
import { sendMessage, markRead } from '../../triggers/message/message.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateAggregateReceipt } from '../../validators/message.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { RECEIPT_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

// See message-delivered-to-all.spec.ts — same group-only-aggregate behavior,
// verified live 2026-09-04.
test('message_read_by_all webhook fires once every group member has read the message', async () => {
  const guid = uniqueGroupGuid('qa-agg-read');
  registerCleanup(() => deleteGroup(guid, QA_USER_1).catch(() => {}));
  await createGroup({ guid, name: 'Aggregate Read Test Group', onBehalfOf: QA_USER_1 });
  await addGroupMember(guid, { participants: [QA_USER_2], onBehalfOf: QA_USER_1 });

  const message = await sendMessage({ sender: QA_USER_1, receiver: guid, receiverType: 'group', text: uniqueMessageText('agg-read-check') });

  await resetEvents();
  // markRead internally marks delivered first (readByAll implies deliveredToAll), same as a real client would.
  const { client } = await markRead(QA_USER_2, message.id, guid, 'group', QA_USER_1);
  registerCleanup(() => client.close());

  const payload = await expectWebhookEvent('message_read_by_all', matchers.byReceiptMessageId(message.id), RECEIPT_TIMEOUT_MS);

  validateAggregateReceipt(payload, { trigger: 'message_read_by_all', action: 'readByAll', messageId: message.id, guid, sender: QA_USER_1 });
});
