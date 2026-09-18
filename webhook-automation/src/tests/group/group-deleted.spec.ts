import { test } from '@playwright/test';
import { createGroup, deleteGroup } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupDeleted } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1 } from '../../data/factories/user.factory';

test.beforeEach(async () => {
  await resetEvents();
});

test('group_deleted webhook fires for the deleted guid', async () => {
  const guid = uniqueGroupGuid('qa-group-deleted');
  await createGroup({ guid, name: 'To Be Deleted', onBehalfOf: QA_USER_1 });
  await resetEvents();

  await deleteGroup(guid, QA_USER_1);

  const payload = await expectWebhookEvent('group_deleted', matchers.byGroupGuid(guid));

  validateGroupDeleted(payload, { guid });
});
