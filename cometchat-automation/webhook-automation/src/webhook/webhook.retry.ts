/**
 * Duplicate-delivery detection: after a webhook first arrives, keep watching
 * for a settle window to see if CometChat redelivers it (e.g. after a slow
 * first attempt). Distinguishes an *expected* single delivery from an
 * *unexpected* duplicate — used by duplicate-delivery tests, which assert
 * exactly one delivery per action rather than merely "at least one".
 */
import { fetchEvents, StoredWebhookEvent } from './webhook.store';
import { WebhookMatcher } from './webhook.matcher';
import { sleep } from '../utils/timeout';
import { DUPLICATE_SETTLE_WINDOW_MS } from '../utils/timeout';

export interface DuplicateCheckResult {
  matches: StoredWebhookEvent[];
  isDuplicate: boolean;
}

/** Watches for `settleMs` after a first match was already confirmed present, and returns every matching delivery seen in that window. */
export async function watchForDuplicates(
  trigger: string,
  matcher: WebhookMatcher,
  settleMs: number = DUPLICATE_SETTLE_WINDOW_MS
): Promise<DuplicateCheckResult> {
  const deadline = Date.now() + settleMs;
  // Accumulate distinct events (by id) across every poll, not just the last
  // one — a single poll returning fewer/zero results (a transient blip, or
  // the receiver's in-memory store resetting mid-window, e.g. a Render
  // free-tier restart) used to silently discard everything seen in earlier,
  // successful polls, producing a false "0 matches" even when the calling
  // expectWebhookEvent() had already confirmed the event was really there.
  // Verified live 2026-09-09: this is what caused a genuinely-fired
  // user_blocked webhook to fail with "got 0 (none matched)".
  const seen = new Map<string, StoredWebhookEvent>();
  while (Date.now() < deadline) {
    const events = await fetchEvents(trigger);
    for (const e of events.filter((e) => matcher(e.payload))) {
      seen.set(e.id, e);
    }
    await sleep(500);
  }
  const matches = [...seen.values()];
  return { matches, isDuplicate: matches.length > 1 };
}
