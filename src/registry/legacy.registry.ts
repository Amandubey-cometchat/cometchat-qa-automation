import { WebhookRegistryEntry } from './webhook.registry';
import { AppEnvName } from '../config/config.schema';

const ALL_ENVS: AppEnvName[] = ['staging-us', 'prod-us', 'prod-eu', 'prod-in'];

// CometChat's older, simpler webhook mechanism — a completely separate
// system from the ~56-trigger Management API webhooks tracked everywhere
// else in this registry. Confirmed live (2026-09-06, via the Dashboard's own
// "Enter webhook details" legacy webhook form) and cross-checked against
// CometChat's legacy webhooks docs: a given app can only have ONE webhook
// system active at a time — configuring legacy replaces the modern webhook
// config this project's other automated tests depend on, not adds to it.
// Only runnable via scripts/test-legacy.ts (see its header comment for the
// safety design), never as part of the regular suite. before_message is
// automated (live-verified 2026-09-09, prod-eu); the rest still need their
// own live capture — see each entry's reason for why.
const MUTUAL_EXCLUSIVITY_REASON =
  'Legacy and modern webhooks are mutually exclusive per app — activating legacy on any of staging-us/prod-us/' +
  'prod-eu/prod-in would disable the modern webhook config the existing 26 automated tests depend on, so this ' +
  'has not been switched on anywhere yet. Needs either a dedicated app for legacy-only testing, or an explicit, ' +
  'deliberate toggle + revert on a shared app for a scoped test window.';

export const LEGACY_REGISTRY: WebhookRegistryEntry[] = [
  {
    id: 'after_message',
    category: 'LEGACY',
    environments: ALL_ENVS,
    trigger: 'Send a text message (legacy webhook system)',
    expectedEvent: 'after_message',
    automationMethod: 'REST',
    expectedPayloadKeys: [],
    status: 'NOT_IMPLEMENTED',
    specFile: 'src/tests/legacy/legacy.spec.ts',
    testTitleMatch: 'after_message (documented gap)',
    reason: MUTUAL_EXCLUSIVITY_REASON,
  },
  {
    id: 'before_message',
    category: 'LEGACY',
    environments: ['prod-eu'],
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
    environments: ALL_ENVS,
    trigger: 'A real SDK client calls markAsDelivered (legacy webhook system)',
    expectedEvent: 'message_delivery_receipt',
    automationMethod: 'SDK',
    expectedPayloadKeys: [],
    status: 'NOT_IMPLEMENTED',
    specFile: 'src/tests/legacy/legacy.spec.ts',
    testTitleMatch: 'message_delivery_receipt (legacy) (documented gap)',
    reason:
      MUTUAL_EXCLUSIVITY_REASON +
      ' Shares its trigger name with the modern message_delivery_receipt webhook (see message.registry.ts) — ' +
      'the payload shape is not assumed to be identical and needs its own live capture once testable.',
  },
  {
    id: 'message_read_receipt_legacy',
    category: 'LEGACY',
    environments: ALL_ENVS,
    trigger: 'A real SDK client calls markAsRead (legacy webhook system)',
    expectedEvent: 'message_read_receipt',
    automationMethod: 'SDK',
    expectedPayloadKeys: [],
    status: 'NOT_IMPLEMENTED',
    specFile: 'src/tests/legacy/legacy.spec.ts',
    testTitleMatch: 'message_read_receipt (legacy) (documented gap)',
    reason:
      MUTUAL_EXCLUSIVITY_REASON +
      ' Shares its trigger name with the modern message_read_receipt webhook (see message.registry.ts) — the ' +
      'payload shape is not assumed to be identical and needs its own live capture once testable.',
  },
  {
    id: 'after_connection_status_changed',
    category: 'LEGACY',
    environments: ALL_ENVS,
    trigger: 'A real SDK client connects/disconnects (legacy webhook system)',
    expectedEvent: 'after_connection_status_changed',
    automationMethod: 'SDK',
    expectedPayloadKeys: [],
    status: 'NOT_IMPLEMENTED',
    specFile: 'src/tests/legacy/legacy.spec.ts',
    testTitleMatch: 'after_connection_status_changed (documented gap)',
    reason: MUTUAL_EXCLUSIVITY_REASON,
  },
];
