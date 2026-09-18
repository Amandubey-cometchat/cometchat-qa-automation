import { WebhookRegistryEntry } from './webhook.registry';

// CometChat's older, simpler webhook mechanism — a completely separate
// system from the ~56-trigger Management API webhooks tracked everywhere
// else in this registry. Confirmed live (2026-09-06, via the Dashboard's own
// "Enter webhook details" legacy webhook form) and cross-checked against
// CometChat's legacy webhooks docs: a given app can only have ONE webhook
// system active at a time — configuring legacy replaces the modern webhook
// config this project's other automated tests depend on, not adds to it.
// Only runnable via scripts/test-legacy.ts (see its header comment for the
// safety design), never as part of the regular suite. All 5 triggers are
// now automated and live-verified against a real, temporary Legacy-mode
// window on prod-us (2026-09-15) — before_message additionally verified
// earlier against prod-eu (2026-09-09). Every payload shape below was
// captured live, not inferred from the modern equivalents — confirmed to
// differ substantially (see each validator in legacy.validator.ts).
export const LEGACY_REGISTRY: WebhookRegistryEntry[] = [
  {
    id: 'after_message',
    category: 'LEGACY',
    environments: ['prod-us'],
    trigger: 'Send a text message (legacy webhook system) — fires AFTER the message is persisted, distinct from before_message',
    expectedEvent: 'after_message',
    automationMethod: 'REST',
    expectedPayloadKeys: ['data.id', 'data.sender', 'data.receiver', 'data.receiverType', 'data.data.text'],
    status: 'AUTOMATED',
    specFile: 'src/tests/legacy/after-message.spec.ts',
    testTitleMatch: 'after_message webhook fires',
  },
  {
    id: 'before_message',
    category: 'LEGACY',
    environments: ['prod-eu', 'prod-us'],
    trigger: 'Send a text message (legacy webhook system) — fires synchronously BEFORE the message is persisted',
    expectedEvent: 'before_message',
    automationMethod: 'REST',
    expectedPayloadKeys: ['data.sender', 'data.receiver', 'data.data.text', 'data.data.entities.sender.entity.uid'],
    status: 'AUTOMATED',
    specFile: 'src/tests/legacy/before-message.spec.ts',
    testTitleMatch: 'before_message webhook fires',
  },
  {
    id: 'message_delivery_receipt_legacy',
    category: 'LEGACY',
    environments: ['prod-us'],
    trigger: 'A real SDK client calls markAsDelivered (legacy webhook system)',
    expectedEvent: 'message_delivery_receipt',
    automationMethod: 'SDK',
    expectedPayloadKeys: ['data.messageId', 'data.receiptType', 'data.messageSender', 'data.receiptSender', 'data.receiptReceiver'],
    status: 'AUTOMATED',
    specFile: 'src/tests/legacy/message-delivery-receipt-legacy.spec.ts',
    testTitleMatch: 'message_delivery_receipt (legacy) webhook fires',
  },
  {
    id: 'message_read_receipt_legacy',
    category: 'LEGACY',
    environments: ['prod-us'],
    trigger: 'A real SDK client calls markAsRead (legacy webhook system)',
    expectedEvent: 'message_read_receipt',
    automationMethod: 'SDK',
    expectedPayloadKeys: ['data.messageId', 'data.receiptType', 'data.messageSender', 'data.receiptSender', 'data.receiptReceiver'],
    status: 'AUTOMATED',
    specFile: 'src/tests/legacy/message-read-receipt-legacy.spec.ts',
    testTitleMatch: 'message_read_receipt (legacy) webhook fires',
  },
  {
    id: 'after_connection_status_changed',
    category: 'LEGACY',
    environments: ['prod-us'],
    trigger: 'A real SDK client connects/disconnects (legacy webhook system)',
    expectedEvent: 'after_connection_status_changed',
    automationMethod: 'SDK',
    expectedPayloadKeys: ['data.user.uid', 'data.user.status', 'data.event.type'],
    status: 'AUTOMATED',
    specFile: 'src/tests/legacy/after-connection-status-changed.spec.ts',
    testTitleMatch: 'after_connection_status_changed webhook fires',
  },
];
