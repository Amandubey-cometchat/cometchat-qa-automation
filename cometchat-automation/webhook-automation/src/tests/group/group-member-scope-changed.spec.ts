import { test } from '@playwright/test';
import { createGroup, deleteGroup, addGroupMember, changeMemberScope } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupMemberScopeChanged } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('group_member_scope_changed webhook fires with old and new scope', async () => {
  const guid = uniqueGroupGuid('qa-group-scope');
  registerCleanup(() => deleteGroup(guid).catch(() => {}));
  await createGroup({ guid, name: 'Scope Group', onBehalfOf: QA_USER_1 });
  await addGroupMember(guid, { participants: [QA_USER_2], onBehalfOf: QA_USER_1 });
  await resetEvents();

  await changeMemberScope(guid, QA_USER_2, 'moderator', QA_USER_1);

  const payload = await expectWebhookEvent('group_member_scope_changed', matchers.byGroupGuid(guid));

  validateGroupMemberScopeChanged(payload, { guid, member: QA_USER_2, newScope: 'moderator', oldScope: 'participant', actor: QA_USER_1 });
});
