import { test, expect } from '@playwright/test';
import { sendMessage } from '../../triggers/message/message.triggers';
import { createGroup, deleteGroup } from '../../triggers/group/group.triggers';
import { blockUser, unblockUser } from '../../triggers/user/user.triggers';
import { resetEvents, expectSingleWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { uniqueMessageText } from '../../data/factories/message.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';

// These checks verify webhook *delivery* behaviour rather than payload
// shape: one action should produce exactly one webhook call, never a
// duplicate from a retried delivery. Run across a few representative
// triggers rather than all of them, since retries are a property of
// CometChat's delivery layer, not of any individual trigger's payload.

test.beforeEach(async () => {
  await resetEvents();
});

test('message_sent is not delivered more than once for a single message', async () => {
  const text = uniqueMessageText('dup-check');

  const message = await sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text });

  const payload = await expectSingleWebhookEvent('message_sent', matchers.byMessageId(message.id));
  expect(payload.data.message.data.text).toBe(text);
});

test('group_created is not delivered more than once for a single group', async () => {
  const guid = uniqueGroupGuid('qa-group-dup');

  await createGroup({ guid, name: 'Duplicate Check Group', onBehalfOf: QA_USER_1 });

  try {
    const payload = await expectSingleWebhookEvent('group_created', matchers.byGroupGuid(guid));
    expect(payload.data.group.owner).toBe(QA_USER_1);
  } finally {
    await deleteGroup(guid).catch(() => {});
  }
});

test('user_blocked is not delivered more than once for a single block action', async () => {
  await blockUser(QA_USER_1, QA_USER_2);

  try {
    const payload = await expectSingleWebhookEvent('user_blocked', matchers.byBlockerUid(QA_USER_1));
    expect(payload.data.users).toHaveProperty(QA_USER_2);
  } finally {
    await unblockUser(QA_USER_1, QA_USER_2).catch(() => {});
  }
});
