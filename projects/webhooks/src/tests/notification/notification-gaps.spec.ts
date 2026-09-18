import { test } from '@playwright/test';
import { NOTIFICATION_REGISTRY } from '../../registry/notification.registry';

// Documented gaps within NOTIFICATION that aren't real tests yet — see
// src/registry/notification.registry.ts for the full reasoning. Generated
// from the registry itself so this file can never drift out of sync with
// it (same pattern as every other category's gap file).
test.describe('Notification webhooks (documented gaps)', () => {
  for (const entry of NOTIFICATION_REGISTRY.filter((e) => e.status !== 'AUTOMATED')) {
    test(`${entry.id} (documented gap)`, () => {
      test.skip(true, `[${entry.status}] ${entry.reason}`);
    });
  }
});
