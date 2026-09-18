import { test } from '@playwright/test';
import { MEETINGS_REGISTRY } from '../../registry/meetings.registry';

// Documented gaps, not silently omitted tests — see
// src/registry/meetings.registry.ts for the full reasoning. Generated from
// the registry itself so this file can never drift out of sync with it.
test.describe('Meetings webhooks (documented gaps)', () => {
  for (const entry of MEETINGS_REGISTRY.filter((e) => e.status !== 'AUTOMATED')) {
    test(`${entry.id} (documented gap)`, () => {
      test.skip(true, `[${entry.status}] ${entry.reason}`);
    });
  }
});
