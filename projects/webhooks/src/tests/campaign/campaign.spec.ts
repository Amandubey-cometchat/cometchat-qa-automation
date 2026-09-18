import { test } from '@playwright/test';
import { CAMPAIGN_REGISTRY } from '../../registry/campaign.registry';

// Documented gaps, not silently omitted tests — see
// src/registry/campaign.registry.ts for the full reasoning. Generated from
// the registry itself so this file can never drift out of sync with it.
test.describe('Campaign webhooks (documented gaps)', () => {
  for (const entry of CAMPAIGN_REGISTRY.filter((e) => e.status !== 'AUTOMATED')) {
    test(`${entry.id} (documented gap)`, () => {
      test.skip(true, `[${entry.status}] ${entry.reason}`);
    });
  }
});
