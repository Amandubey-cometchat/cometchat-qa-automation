/**
 * A drop-in replacement for `@playwright/test`'s `test` that adds an
 * automatic exactly-once guard to every test using it.
 *
 * WHY THIS EXISTS, AND WHY expectSingleWebhookEvent ISN'T ENOUGH:
 * expectSingleWebhookEvent duplicate-checks ONE trigger scoped to ONE
 * correlation id. That misses the whole class of bug found on 2026-09-16,
 * where editing a message fired 3 extra `message_sent` webhooks for
 * auto-generated "action" messages carrying *fresh message ids* — a
 * per-correlation-id check finds exactly one of each and passes happily.
 *
 * This guard instead watches everything the receiver got during the test,
 * after a settle window long enough to catch late arrivals (those action
 * messages landed ~3.5s after the edit), and fails on any trigger
 * delivered more than once. That is the actual requirement: one action,
 * one webhook — duplicates or triples are bugs, not noise.
 *
 * Tests that legitimately produce several of the same trigger (sending
 * three messages on purpose, a group action fanning out per member, a call
 * event firing per participant) declare it with `allowMultiple(...)`,
 * which documents the expectation instead of silently weakening it.
 *
 * KNOWN LIMITATION — why this is opt-in rather than always on:
 * global per-trigger counting cannot separate a genuine duplicate from
 * unrelated concurrent traffic on the same app, and it proved noisy enough
 * on prod-us to produce false failures on tests that were entirely correct.
 *
 * The two problems it conflates actually need different checks:
 *   1. DUPLICATE DELIVERY — the same trigger for the same entity, twice.
 *      Wants counting keyed by (trigger + correlation id), which is immune
 *      to background noise. Note this would NOT have caught the edit bug:
 *      those extra message_sent events each carried a *different* id.
 *   2. UNEXPECTED SIDE EFFECTS — an action producing webhooks nobody asked
 *      for, which is what the edit bug actually is. Wants each test to
 *      declare the full set of triggers its actions should produce, scoped
 *      to entities the test itself created.
 * Doing (1) and (2) separately is the real fix; this fixture is the blunt
 * first cut that found the edit and delete bugs.
 */
import { test as base, expect } from '@playwright/test';
import { fetchEvents } from '../webhook/webhook.listener';
import { sleep, DUPLICATE_SETTLE_WINDOW_MS } from '../utils/timeout';

/** Triggers this test is allowed to receive more than once, with the reason why. */
const allowances = new Map<string, string>();

/**
 * Declare that `trigger` may legitimately arrive more than once in this
 * test. Always pass a real reason — the point is to document the
 * expectation, not to mute the guard.
 */
export function allowMultiple(trigger: string, reason: string): void {
  allowances.set(trigger, reason);
}

export const test = base.extend<{ webhookGuard: void }>({
  webhookGuard: [
    async ({}, use) => {
      allowances.clear();

      await use();

      // OPT-IN, and deliberately so. Counting every trigger globally can't
      // tell a real duplicate delivery apart from unrelated concurrent
      // traffic, and these apps demonstrably carry it: message-sent.spec.ts
      // — which only sends one REST message and never starts an SDK client
      // — still observed message_delivery_receipt x2 and a
      // message_read_receipt from some other live client (prod-us,
      // 2026-09-16). Left off by default so that noise can't mask real
      // regressions; set WEBHOOK_GUARD=1 to run it deliberately, ideally on
      // a quiet app. See the header for the sharper design this wants.
      if (process.env.WEBHOOK_GUARD !== '1') return;

      // Skipped/failed tests have nothing meaningful to guard — a failure
      // here would mask the real error the test already reported.
      const info = test.info();
      if (info.status === 'skipped' || info.status !== info.expectedStatus) return;

      // Late duplicates are the dangerous kind: the edit-bug action
      // messages arrived ~3.5s after the triggering call, well after the
      // test's own wait had already resolved.
      await sleep(DUPLICATE_SETTLE_WINDOW_MS);

      const events = await fetchEvents();
      const counts = new Map<string, number>();
      for (const e of events) {
        if (!e.trigger) continue;
        counts.set(e.trigger, (counts.get(e.trigger) || 0) + 1);
      }

      const offenders = [...counts.entries()]
        .filter(([trigger, count]) => count > 1 && !allowances.has(trigger))
        .map(([trigger, count]) => `  ${trigger} x${count}`);

      expect(
        offenders.length,
        `Expected each webhook to be delivered exactly once for this test's actions, but got:\n${offenders.join('\n')}\n` +
          `All triggers seen: ${[...counts.entries()].map(([t, c]) => `${t}=${c}`).join(', ')}\n` +
          `If a repeat is genuinely correct here, declare it with allowMultiple('<trigger>', '<why>').`
      ).toBe(0);
    },
    { auto: true },
  ],
});

export { expect };
