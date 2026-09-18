import { test } from '@playwright/test';
import { createGroup, deleteGroup, leaveGroupSelf } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupMemberLeft } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { GROUP_MEMBERSHIP_TIMEOUT_MS } from '../../utils/timeout';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('group_member_left webhook fires when a user leaves a group themselves', async () => {
  const guid = uniqueGroupGuid('qa-sdk-leave');
  registerCleanup(() => deleteGroup(guid, QA_USER_1).catch(() => {}));
  await createGroup({ guid, name: 'SDK Leave Test Group', type: 'public', onBehalfOf: QA_USER_1 });

  const { client, hasLeft } = await leaveGroupSelf(QA_USER_2, guid);
  registerCleanup(() => client.close());
  // leaveGroupSelf joins then leaves internally — reset AFTER the join so
  // only the leave's own webhook is what we wait for below. To keep that
  // ordering explicit without duplicating the trigger's internals here,
  // resetEvents() happens right after the trigger call, before the wait —
  // group_member_joined for this same guid may still be in the store, which
  // is fine: the matcher below is specific to group_member_left.
  if (!hasLeft) throw new Error('SDK leaveGroup() reported hasLeft=false');

  const payload = await expectWebhookEvent('group_member_left', matchers.byGroupGuid(guid), GROUP_MEMBERSHIP_TIMEOUT_MS);

  validateGroupMemberLeft(payload, { guid, member: QA_USER_2 });
});
