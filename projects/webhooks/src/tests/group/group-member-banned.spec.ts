import { test } from '@playwright/test';
import { createGroup, deleteGroup, addGroupMember, banGroupMember } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupMemberBanned } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('group_member_banned webhook fires with correct member and actor', async () => {
  // KNOWN COMETCHAT BUG (confirmed 2026-09-01): when Ban Member is called
  // with an onBehalfOf header, the REST response correctly bans the target
  // (entities.on.entity.uid = target), but the group_member_banned webhook's
  // data.members incorrectly contains the *actor's* UID instead of the
  // target's — duplicating data.by. Reproduced consistently outside this
  // suite via direct fetch(), so it's not a test artifact. Tracked here as
  // an expected failure rather than silently weakened or skipped.
  test.fail(true, 'CometChat webhook bug: group_member_banned.data.members contains the actor, not the banned target, when onBehalfOf is used');

  const guid = uniqueGroupGuid('qa-group-ban');
  registerCleanup(() => deleteGroup(guid).catch(() => {}));
  await createGroup({ guid, name: 'Ban Group', onBehalfOf: QA_USER_1 });
  await addGroupMember(guid, { participants: [QA_USER_2], onBehalfOf: QA_USER_1 });
  await resetEvents();

  await banGroupMember(guid, QA_USER_2, QA_USER_1);

  const payload = await expectWebhookEvent('group_member_banned', matchers.byGroupGuid(guid));

  validateGroupMemberBanned(payload, { guid, member: QA_USER_2, actor: QA_USER_1 });
});
