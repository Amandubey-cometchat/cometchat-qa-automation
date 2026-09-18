import { test } from '@playwright/test';
import { MESSAGE_REGISTRY } from '../../registry/message.registry';

// Documented gaps within MESSAGE that aren't real tests yet — see
// src/registry/message.registry.ts for the full reasoning per webhook.
// Generated from the registry itself so this file can never drift out of
// sync with it (same pattern as moderation/calls/meetings/campaign).
test.describe('Message webhooks (documented gaps)', () => {
  for (const entry of MESSAGE_REGISTRY.filter((e) => e.status === 'NOT_IMPLEMENTED')) {
    test(`${entry.id} (documented gap)`, () => {
      test.skip(true, `[${entry.status}] ${entry.reason}`);
    });
  }
});
