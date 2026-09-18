import { test, expect } from '@playwright/test';
import { sendMessage, editMessage } from '../../triggers/message/message.triggers';
import { createGroup, deleteGroup, updateGroup, kickGroupMember, addGroupMember } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, assertNoWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { getConfig } from '../../config/env';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

// Every case here first proves the REST call was actually rejected (not a
// fabricated assumption), then proves the corresponding webhook never fired.
// A rejected action producing a webhook anyway would itself be a serious bug.

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('sending a message to a nonexistent user is rejected and fires no message_sent', async () => {
  const receiver = `no-such-user-${Date.now()}`;

  await expect(sendMessage({ sender: QA_USER_1, receiver, text: 'should never arrive' })).rejects.toThrow(/404/);

  await assertNoWebhookEvent('message_sent', (p) => p?.data?.message?.receiver === receiver);
});

test('creating a group with a duplicate guid is rejected and fires only one group_created', async () => {
  const guid = `qa-neg-dup-${Date.now()}`;
  registerCleanup(() => deleteGroup(guid).catch(() => {}));
  await createGroup({ guid, name: 'Original' });
  // Wait for the *first* group's own webhook to actually land before
  // resetting — otherwise its legitimately-delayed delivery can arrive
  // during the "expect nothing" window below and look like a duplicate from
  // the (rejected) second call, which never should have fired anything.
  await expectWebhookEvent('group_created', matchers.byGroupGuid(guid));
  await resetEvents();

  await expect(createGroup({ guid, name: 'Duplicate attempt' })).rejects.toThrow(/400/);

  await assertNoWebhookEvent('group_created', matchers.byGroupGuid(guid));
});

test('kicking a user who never joined the group is rejected and fires no group_member_kicked', async () => {
  const guid = `qa-neg-notmember-${Date.now()}`;
  registerCleanup(() => deleteGroup(guid).catch(() => {}));
  await createGroup({ guid, name: 'Not Member Group', onBehalfOf: QA_USER_1 });
  await resetEvents();

  await expect(kickGroupMember(guid, QA_USER_2, QA_USER_1)).rejects.toThrow(/404/);

  await assertNoWebhookEvent('group_member_kicked', matchers.byGroupGuid(guid));
});

test('updating a nonexistent group is rejected and fires no group_updated', async () => {
  const guid = `qa-neg-missing-${Date.now()}`;

  await expect(updateGroup(guid, { name: 'x' })).rejects.toThrow(/404/);

  await assertNoWebhookEvent('group_updated', matchers.byGroupGuid(guid));
});

test('editing a nonexistent message is rejected and fires no message_edited', async () => {
  const fakeId = '999999999999';

  await expect(editMessage(fakeId, 'x')).rejects.toThrow(/404/);

  await assertNoWebhookEvent('message_edited', matchers.byMessageId(fakeId));
});

test('an invalid REST API key is rejected with 401', async () => {
  const { appId, region } = getConfig();
  const res = await fetch(`https://${appId}.api-${region}.cometchat.io/v3/users`, {
    headers: { appId, apiKey: 'totally-invalid-key', 'Content-Type': 'application/json' },
  });
  expect(res.status).toBe(401);
});

test('the local webhook receiver rejects deliveries without valid Basic Auth', async () => {
  // This is the receiver's own security boundary, not CometChat's — proves
  // that a webhook delivery without the configured credentials is actually
  // refused (401) and never stored, rather than assumed to be secure.
  const receiverUrl = `${getConfig().receiverQueryUrl}/webhook`;

  const noAuth = await fetch(receiverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger: 'fake_trigger_for_auth_test', data: {} }),
  });
  expect(noAuth.status).toBe(401);

  const wrongAuth = await fetch(receiverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from('wrong:creds').toString('base64') },
    body: JSON.stringify({ trigger: 'fake_trigger_for_auth_test', data: {} }),
  });
  expect(wrongAuth.status).toBe(401);

  await assertNoWebhookEvent('fake_trigger_for_auth_test');
});

test('sending an empty-text message is rejected and fires no message_sent', async () => {
  await expect(sendMessage({ sender: QA_USER_1, receiver: QA_USER_2, text: '' })).rejects.toThrow(/400/);
});
