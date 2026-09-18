import { test } from '@playwright/test';
import { createGroup, deleteGroup, addGroupMember } from '../../triggers/group/group.triggers';
import { sendMessage, markDelivered } from '../../triggers/message/message.triggers';
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

// message_delivered_to_all is a group-only aggregate, distinct from
// message_delivery_receipt (per-recipient) — verified live 2026-09-04:
// the same markAsDelivered call in a 1:1 conversation fires ONLY the
// per-recipient receipt; this aggregate never fires outside a group, where
// it means "every member has now acknowledged this message".
test('message_delivered_to_all webhook fires once every group member has received the message', async () => {
  const guid = uniqueGroupGuid('qa-agg-delivered');
  registerCleanup(() => deleteGroup(guid, QA_USER_1).catch(() => {}));
  await createGroup({ guid, name: 'Aggregate Delivery Test Group', onBehalfOf: QA_USER_1 });
  await addGroupMember(guid, { participants: [QA_USER_2], onBehalfOf: QA_USER_1 });

  const message = await sendMessage({ sender: QA_USER_1, receiver: guid, receiverType: 'group', text: uniqueMessageText('agg-delivered-check') });

  await resetEvents();
  const { client } = await markDelivered(QA_USER_2, message.id, guid, 'group', QA_USER_1);
  registerCleanup(() => client.close());

  const payload = await expectWebhookEvent('message_delivered_to_all', matchers.byReceiptMessageId(message.id), RECEIPT_TIMEOUT_MS);

  validateAggregateReceipt(payload, { trigger: 'message_delivered_to_all', action: 'deliveredToAll', messageId: message.id, guid, sender: QA_USER_1 });
});
