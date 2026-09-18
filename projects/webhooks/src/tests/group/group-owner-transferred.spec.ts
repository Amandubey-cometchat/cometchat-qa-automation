import { test } from '@playwright/test';
import { createGroup, deleteGroup, addGroupMember, transferGroupOwnership } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupOwnerTransferred } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1, QA_USER_2 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('group_owner_transferred webhook fires with correct old and new owner', async () => {
  const guid = uniqueGroupGuid('qa-group-owner');
  // No onBehalfOf on cleanup deliberately — this test leaves QA_USER_1
  // without owner rights, so cleanup uses the raw admin API key.
  registerCleanup(() => deleteGroup(guid).catch(() => {}));
  await createGroup({ guid, name: 'Owner Group', onBehalfOf: QA_USER_1 });
  await addGroupMember(guid, { participants: [QA_USER_2], onBehalfOf: QA_USER_1 });
  await resetEvents();

  // Deliberately no onBehalfOf here: CometChat's Update Group API docs state
  // the `owner` field is silently ignored whenever onBehalfOf is present —
  // confirmed live (passing both fires group_updated instead of
  // group_owner_transferred, because the ownership change never happens).
  await transferGroupOwnership(guid, QA_USER_2);

  const payload = await expectWebhookEvent('group_owner_transferred', matchers.byGroupGuid(guid));

  validateGroupOwnerTransferred(payload, { guid, newOwner: QA_USER_2, oldOwner: QA_USER_1 });
});
