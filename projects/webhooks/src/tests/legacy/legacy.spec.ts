import { test } from '@playwright/test';
import { LEGACY_REGISTRY } from '../../registry/legacy.registry';

// Documented gaps, not silently omitted tests — see
// src/registry/legacy.registry.ts for the full reasoning per webhook.
// Generated from the registry itself so this file can never drift out of
// sync with it (same pattern as moderation/calls/meetings/campaign).
test.describe('Legacy webhooks (documented gaps)', () => {
  for (const entry of LEGACY_REGISTRY.filter((e) => e.status !== 'AUTOMATED')) {
    test(`${entry.id} (documented gap)`, () => {
      test.skip(true, `[${entry.status}] ${entry.reason}`);
    });
  }
});
