/**
 * The core "wait for a real webhook, don't just trust the trigger's API
 * response" primitive every test in this project is built on. A trigger
 * function's HTTP 200 is never treated as proof a webhook fired — these
 * functions poll the actual receiver until the real event shows up (or
 * time out with a debuggable list of what *did* arrive).
 */
import { fetchEvents } from './webhook.store';
import { watchForDuplicates } from './webhook.retry';
import { WebhookMatcher } from './webhook.matcher';
import { sleep } from '../utils/timeout';
import { DEFAULT_WEBHOOK_TIMEOUT_MS, DUPLICATE_SETTLE_WINDOW_MS, NEGATIVE_CASE_WINDOW_MS } from '../utils/timeout';
import { logger } from '../utils/logger';

export interface ReceivedWebhookPayload {
  trigger: string;
  data: any;
  appId?: string;
  region?: string;
  __event: { id: string; receivedAt: number; method: string; headers: Record<string, string | null> };
  [key: string]: any;
}

/**
 * Polls until an event matching `trigger` (and optionally `matcher`) shows
 * up, or times out. No "since" time window — deliberately: two webhooks for
 * one action (e.g. message_sent + user_mentioned) can both land within the
 * same test before either wait resolves, and a fresh cutoff on a *later*
 * wait could exclude an event that arrived earlier but is still exactly what
 * that later wait wants. resetEvents() at the start of each test already
 * gives per-test isolation — nothing further is needed here.
 */
export async function expectWebhookEvent(
  trigger: string,
  matcher: WebhookMatcher = () => true,
  timeoutMs: number = DEFAULT_WEBHOOK_TIMEOUT_MS
): Promise<ReceivedWebhookPayload> {
  const started = Date.now();
  logger.waiting(trigger);
  const deadline = started + timeoutMs;
  let allSeenThisWindow: Awaited<ReturnType<typeof fetchEvents>> = [];

  while (Date.now() < deadline) {
    allSeenThisWindow = await fetchEvents();
    const match = allSeenThisWindow.find((e) => e.trigger === trigger && matcher(e.payload));
    if (match) {
      logger.received(trigger, Date.now() - started);
      return Object.assign({}, match.payload, {
        __event: { id: match.id, receivedAt: match.receivedAt, method: match.method, headers: match.headers },
      });
    }
    await sleep(500);
  }

  const seen = allSeenThisWindow.length
    ? allSeenThisWindow.map((e) => `  - ${e.trigger} at ${new Date(e.receivedAt).toISOString()} (event id: ${e.id || 'n/a'})`).join('\n')
    : '  (no webhook events of any kind arrived in this window)';
  throw new Error(`Timed out waiting for webhook event "${trigger}" after ${timeoutMs}ms.\nEvents actually received in this window:\n${seen}`);
}

/**
 * Same as expectWebhookEvent, then keeps watching for `settleMs` to catch a
 * late duplicate delivery of the same event. Fails if more than one arrives.
 */
export async function expectSingleWebhookEvent(
  trigger: string,
  matcher: WebhookMatcher,
  timeoutMs: number = DEFAULT_WEBHOOK_TIMEOUT_MS,
  settleMs: number = DUPLICATE_SETTLE_WINDOW_MS
): Promise<ReceivedWebhookPayload> {
  await expectWebhookEvent(trigger, matcher, timeoutMs);

  const { matches, isDuplicate } = await watchForDuplicates(trigger, matcher, settleMs);
  if (isDuplicate || matches.length !== 1) {
    const details = matches.map((e) => `  - event id ${e.id || 'n/a'} received at ${new Date(e.receivedAt).toISOString()}`).join('\n');
    throw new Error(
      `Expected exactly 1 "${trigger}" delivery for this action, got ${matches.length} (possible duplicate webhook delivery).\n${details || '  (none matched)'}`
    );
  }

  return Object.assign({}, matches[0].payload, {
    __event: { id: matches[0].id, receivedAt: matches[0].receivedAt, method: matches[0].method, headers: matches[0].headers },
  });
}

/** The inverse of expectWebhookEvent — proves a webhook did NOT fire for a rejected/invalid action. */
export async function assertNoWebhookEvent(
  trigger: string,
  matcher: WebhookMatcher = () => true,
  windowMs: number = NEGATIVE_CASE_WINDOW_MS
): Promise<void> {
  const deadline = Date.now() + windowMs;
  while (Date.now() < deadline) {
    const events = await fetchEvents(trigger);
    const match = events.find((e) => matcher(e.payload));
    if (match) {
      throw new Error(`Expected no "${trigger}" webhook for this action, but one arrived: ${JSON.stringify(match.payload).slice(0, 300)}`);
    }
    await sleep(500);
  }
}
