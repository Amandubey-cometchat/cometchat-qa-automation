import { test } from '@playwright/test';
import { createGroup, deleteGroup, addGroupMember, banGroupMember, unbanGroupMember } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupMemberUnbanned } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('group_member_unbanned webhook fires with correct member and actor', async () => {
  // KNOWN COMETCHAT BUG (confirmed 2026-09-01): same defect as
  // group_member_banned — data.members contains the actor's UID instead of
  // the unbanned target's when onBehalfOf is used.
  test.fail(true, 'CometChat webhook bug: group_member_unbanned.data.members contains the actor, not the unbanned target, when onBehalfOf is used');

  const guid = uniqueGroupGuid('qa-group-unban');
  registerCleanup(() => deleteGroup(guid).catch(() => {}));
  await createGroup({ guid, name: 'Unban Group', onBehalfOf: QA_USER_1 });
  await addGroupMember(guid, { participants: [QA_USER_2], onBehalfOf: QA_USER_1 });
  await banGroupMember(guid, QA_USER_2, QA_USER_1);
  await resetEvents();

  await unbanGroupMember(guid, QA_USER_2, QA_USER_1);

  const payload = await expectWebhookEvent('group_member_unbanned', matchers.byGroupGuid(guid));

  validateGroupMemberUnbanned(payload, { guid, member: QA_USER_2, actor: QA_USER_1 });
});
