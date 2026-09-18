import { test } from '@playwright/test';
import { createGroup, deleteGroup, addGroupMember } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupMemberAdded } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('group_member_added webhook fires with correct member and actor', async () => {
  const guid = uniqueGroupGuid('qa-group-add-member');
  registerCleanup(() => deleteGroup(guid).catch(() => {}));
  await createGroup({ guid, name: 'Add Member Group', onBehalfOf: QA_USER_1 });
  await resetEvents();

  await addGroupMember(guid, { participants: [QA_USER_2], onBehalfOf: QA_USER_1 });

  const payload = await expectWebhookEvent('group_member_added', matchers.byGroupGuid(guid));

  validateGroupMemberAdded(payload, { guid, member: QA_USER_2, actor: QA_USER_1 });
});
