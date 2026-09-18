import { test } from '@playwright/test';
import { MODERATION_REGISTRY } from '../../registry/moderation.registry';

// Documented gaps, not silently omitted tests — see
// src/registry/moderation.registry.ts for the full reasoning per webhook.
// Generated from the registry itself so this file can never drift out of
// sync with it. test.skip() is called *inside* each test body (not the
// declarative form) so the reason string reaches the JSON reporter output.
test.describe('Moderation webhooks (documented gaps)', () => {
  for (const entry of MODERATION_REGISTRY.filter((e) => e.status !== 'AUTOMATED')) {
    test(`${entry.id} (documented gap)`, () => {
      test.skip(true, `[${entry.status}] ${entry.reason}`);
    });
  }
});
