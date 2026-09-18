export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Webhooks are asynchronous, and different trigger kinds have observed very
// different real-world latency (verified live against prod-eu):
//   - most REST-triggered events: well under 5s
//   - group_member_joined/left (SDK-only): up to ~25-30s
//   - delivery/read receipts, connection status (SDK-only): up to ~15-20s
// These are the *default* budgets a caller can override per wait, not hard limits.
export const DEFAULT_WEBHOOK_TIMEOUT_MS = 10000;
export const GROUP_MEMBERSHIP_TIMEOUT_MS = 35000;
export const RECEIPT_TIMEOUT_MS = 20000;
export const NEGATIVE_CASE_WINDOW_MS = 5000;
export const DUPLICATE_SETTLE_WINDOW_MS = 4000;
/** call_unanswered: ring timeout is set short (CALL_RING_TIMEOUT_SECONDS) via initiateCall()'s 2nd arg, but the webhook wait still needs margin past that for CometChat's own processing — verified live (prod-eu, 2026-09-09): a 5s ring timeout delivered the webhook well within 15s. */
export const CALL_RING_TIMEOUT_SECONDS = 5;
export const CALL_UNANSWERED_TIMEOUT_MS = 20000;
/** call_started/call_participant_joined/call_participant_left/call_ended/call_busy: real WebRTC session join is slower than plain signaling — verified live (prod-eu, 2026-09-09) comfortably within this window. */
export const CALL_SESSION_TIMEOUT_MS = 30000;
/** email-notification-payload-generated / sms-notification-payload-generated: fires well after ordinary message webhooks — observed live at roughly the 1-minute mark, not immediately on send (see src/registry/notification.registry.ts). Generous buffer past that. */
export const NOTIFICATION_TIMEOUT_MS = 90000;
/**
 * Playwright's own per-test timeout for the notification specs, which must
 * exceed NOTIFICATION_TIMEOUT_MS or the test is killed mid-wait and reports
 * a misleading "Test timeout of 30000ms exceeded" instead of a real
 * "webhook never arrived" failure. playwright.config.ts's global `timeout`
 * (30s) suits every other spec here; only these need the override, applied
 * per-spec via test.setTimeout().
 */
export const NOTIFICATION_TEST_TIMEOUT_MS = 120000;
/** How long to watch for an edit's unwanted side-effect webhooks. The 3 auto-generated "edited" action messages arrived at ~0.1s, ~3.5s and ~3.5s after the edit (prod-us, 2026-09-16) — this window covers the slowest with margin, so the check can't pass just by looking too early. See src/tests/message/message-edited.spec.ts. */
export const EDIT_SIDE_EFFECT_WINDOW_MS = 8000;
