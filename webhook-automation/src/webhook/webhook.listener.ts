/**
 * Public facade for the webhook layer — the single import surface tests use
 * (`import { webhook } from '../../webhook/webhook.listener'`), so no test
 * needs to know the store/waiter/matcher/correlation split underneath.
 *
 * Important: the actual HTTP listener CometChat delivers webhooks to is
 * receiver/index.js — a small Express service deployed permanently on
 * Render (see README "Receiver hosting"). It lives outside src/ deliberately:
 * it's a standalone deployed service, not test-framework code, and the
 * target architecture's tree doesn't include it either. This module is the
 * *test-side client* for that already-running listener — resetting its
 * store and polling it, never running a listener itself.
 */
export { resetEvents, fetchEvents } from './webhook.store';
export { expectWebhookEvent, expectSingleWebhookEvent, assertNoWebhookEvent } from './webhook.waiter';
export { watchForDuplicates } from './webhook.retry';
export * as matchers from './webhook.matcher';
export * as correlation from './webhook.correlation';
