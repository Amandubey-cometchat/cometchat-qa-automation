import { test } from '@playwright/test';
import { createGroup, updateGroup, deleteGroup } from '../../triggers/group/group.triggers';
import { resetEvents, expectWebhookEvent, matchers } from '../../webhook/webhook.listener';
import { validateGroupUpdated } from '../../validators/group.validator';
import { uniqueGroupGuid } from '../../data/factories/group.factory';
import { QA_USER_1 } from '../../data/factories/user.factory';
import { registerCleanup, runCleanups } from '../../utils/cleanup';

test.beforeEach(async () => {
  await resetEvents();
});

test.afterEach(async () => {
  await runCleanups();
});

test('group_updated webhook fires with the new name applied', async () => {
  const guid = uniqueGroupGuid('qa-group-updated');
  registerCleanup(() => deleteGroup(guid).catch(() => {}));
  await createGroup({ guid, name: 'Before Update', onBehalfOf: QA_USER_1 });
  await resetEvents();

  await updateGroup(guid, { name: 'After Update' }, QA_USER_1);

  const payload = await expectWebhookEvent('group_updated', matchers.byGroupGuid(guid));

  validateGroupUpdated(payload, { guid, newName: 'After Update', oldName: 'Before Update' });
});
