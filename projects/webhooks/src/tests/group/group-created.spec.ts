import { test } from '@playwright/test';
import { createGroup, deleteGroup } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupCreated } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('group_created webhook fires with correct guid, name, type and owner', async () => {
  const guid = uniqueGroupGuid('qa-group-created');
  registerCleanup(() => deleteGroup(guid).catch(() => {}));

  const created = await createGroup({ guid, name: 'QA Created Group', onBehalfOf: QA_USER_1 });

  const payload = await expectWebhookEvent('group_created', matchers.byGroupGuid(guid));

  validateGroupCreated(payload, { guid, name: 'QA Created Group', owner: QA_USER_1, createdAt: created.createdAt });
});
