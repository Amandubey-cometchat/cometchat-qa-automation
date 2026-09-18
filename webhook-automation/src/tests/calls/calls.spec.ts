import { test } from '@playwright/test';
import { CALLS_REGISTRY } from '../../registry/calls.registry';

// Documented gaps, not silently omitted tests — see
// src/registry/calls.registry.ts for the full reasoning. Generated from the
// registry itself so this file can never drift out of sync with it.
test.describe('Calls webhooks (documented gaps)', () => {
  for (const entry of CALLS_REGISTRY.filter((e) => e.status !== 'AUTOMATED')) {
    test(`${entry.id} (documented gap)`, () => {
      test.skip(true, `[${entry.status}] ${entry.reason}`);
    });
  }
});
