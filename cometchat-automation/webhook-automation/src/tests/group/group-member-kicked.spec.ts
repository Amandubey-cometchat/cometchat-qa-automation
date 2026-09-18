import { test } from '@playwright/test';
import { createGroup, deleteGroup, addGroupMember, kickGroupMember } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupMemberKicked } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('group_member_kicked webhook fires with correct member and actor', async () => {
  const guid = uniqueGroupGuid('qa-group-kick');
  registerCleanup(() => deleteGroup(guid).catch(() => {}));
  await createGroup({ guid, name: 'Kick Group', onBehalfOf: QA_USER_1 });
  await addGroupMember(guid, { participants: [QA_USER_2], onBehalfOf: QA_USER_1 });
  await resetEvents();

  await kickGroupMember(guid, QA_USER_2, QA_USER_1);

  const payload = await expectWebhookEvent('group_member_kicked', matchers.byGroupGuid(guid));

  validateGroupMemberKicked(payload, { guid, member: QA_USER_2, actor: QA_USER_1 });
});
