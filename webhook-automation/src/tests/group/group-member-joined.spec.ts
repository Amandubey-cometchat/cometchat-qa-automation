import { test } from '@playwright/test';
import { createGroup, deleteGroup, joinGroupSelf } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupMemberJoined } from '../../validators/group.validator';
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

// group_member_joined can take up to ~25-30s to deliver — verified live,
// well past this suite's 10s default used elsewhere.
test('group_member_joined webhook fires when a user joins a public group themselves', async () => {
  const guid = uniqueGroupGuid('qa-sdk-join');
  registerCleanup(() => deleteGroup(guid, QA_USER_1).catch(() => {}));
  await createGroup({ guid, name: 'SDK Join Test Group', type: 'public', onBehalfOf: QA_USER_1 });

  await resetEvents();
  const { client, hasJoined } = await joinGroupSelf(QA_USER_2, guid);
  registerCleanup(() => client.close());
  if (!hasJoined) throw new Error('SDK joinGroup() reported hasJoined=false');

  const payload = await expectWebhookEvent('group_member_joined', matchers.byGroupGuid(guid), GROUP_MEMBERSHIP_TIMEOUT_MS);

  validateGroupMemberJoined(payload, { guid, owner: QA_USER_1, member: QA_USER_2 });
});
