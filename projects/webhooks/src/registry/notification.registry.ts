import { WebhookRegistryEntry } from './webhook.registry';

// CometChat's Notifications feature (cometchat.com/docs/notifications) — a
// third, separate system from both the ~56-trigger Management API webhooks
// tracked everywhere else in this registry AND from Campaign's own push
// notifications (see campaign.registry.ts, a different module entirely).
// Configured under Dashboard -> Settings -> Notifications -> Providers,
// each of Email/SMS/Push with its OWN Custom Provider webhook URL field —
// separate from (but reusable as) the main Webhooks config. Confirmed via
// cometchat.com/docs/notifications/email-custom-providers,
// .../sms-custom-providers, and .../custom-providers.md (push) 2026-09-15:
// all 3 fire once per recipient off an ordinary action rather than a
// distinct REST call, so every trigger function here just reuses the
// ordinary message send — same pattern as Legacy webhooks reusing Modern's
// sendMessage. Payload envelope matches the main system's shape
// (trigger/data/appId/region/webhook: "custom"), but each has a
// structurally different data shape.
//
// All 3 are now live-verified, each only on the environments listed per
// entry — every other environment still needs its own Dashboard config
// before these can be trusted there, which is why the real specs stay
// behind playwright.config.ts's RUN_NOTIFICATION gate. Live-measured
// delivery latency (prod-us, 2026-09-16): email 61.8s, sms 60.4s, push
// 1.1s — hence NOTIFICATION_TIMEOUT_MS's 90s budget and the per-spec
// test.setTimeout() override, since the config's global 30s test timeout
// would otherwise kill the email/sms waits mid-flight.

export const NOTIFICATION_REGISTRY: WebhookRegistryEntry[] = [
  {
    id: 'email-notification-payload-generated',
    category: 'NOTIFICATION',
    environments: ['prod-us'],
    trigger: 'Send a message to a recipient with the Custom Email Provider enabled (fires once per recipient; live-measured 61.8s after send)',
    expectedEvent: 'email-notification-payload-generated',
    automationMethod: 'REST',
    expectedPayloadKeys: ['data.to.uid', 'data.messages', 'data.senderDetails', 'data.subject'],
    status: 'AUTOMATED',
    specFile: 'src/tests/notification/email-notification.spec.ts',
    testTitleMatch: 'email-notification-payload-generated webhook fires',
  },
  {
    id: 'sms-notification-payload-generated',
    category: 'NOTIFICATION',
    environments: ['prod-us'],
    trigger: 'Send a message to a recipient with the Custom SMS Provider enabled (fires once per recipient; live-measured 60.4s after send)',
    expectedEvent: 'sms-notification-payload-generated',
    automationMethod: 'REST',
    expectedPayloadKeys: ['data.to.uid', 'data.messages', 'data.senderDetails', 'data.smsContent'],
    status: 'AUTOMATED',
    specFile: 'src/tests/notification/sms-notification.spec.ts',
    testTitleMatch: 'sms-notification-payload-generated webhook fires',
  },
  {
    // CORRECTION 2026-09-15: an earlier version of this entry claimed no
    // Custom Push Provider webhook exists at all, based on 2 doc pages
    // (notifications/push-integration, a guessed push-custom-providers URL)
    // that turned out to be incomplete — the real page is
    // notifications/custom-providers.md, found via the docs' own llms.txt
    // index. The user's real Dashboard already had this configured and
    // enabled on prod-eu; live-verified the same day by sending one real
    // message and receiving a genuine push-notification-payload-generated
    // event — also independently confirmed working on prod-us the same
    // day. Lesson already learned once this session with message_pinned,
    // relearned here: a doc page not existing at the URL you tried is not
    // proof the feature doesn't exist — check the docs' own index, or
    // trust a live Dashboard screenshot over an incomplete search.
    //
    // Far broader trigger surface than Email/SMS: fires once per recipient
    // for chat messages (send/edit/delete), calls (initiated/cancelled/
    // unanswered/ongoing/rejected/ended/busy), reactions, and group actions
    // (join/leave/kick/ban/unban/add) — this entry only exercises the
    // simplest case (an ordinary message), matching Email/SMS's approach.
    id: 'push-notification-payload-generated',
    category: 'NOTIFICATION',
    environments: ['prod-eu', 'prod-us'],
    trigger: 'Send a message to a recipient with the Custom Push Notification Provider enabled (also fires for calls/reactions/group actions — untested here)',
    expectedEvent: 'push-notification-payload-generated',
    automationMethod: 'REST',
    expectedPayloadKeys: ['data.to.uid', 'data.notificationDetails.title', 'data.notificationDetails.body', 'data.notificationDetails.sender', 'data.notificationDetails.type'],
    status: 'AUTOMATED',
    specFile: 'src/tests/notification/push-notification.spec.ts',
    testTitleMatch: 'push-notification-payload-generated webhook fires',
  },
];
