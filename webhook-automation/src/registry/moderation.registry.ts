import { WebhookRegistryEntry } from './webhook.registry';
import { AppEnvName } from '../config/config.schema';

const ALL_ENVS: AppEnvName[] = ['staging-us', 'prod-us', 'prod-eu', 'prod-in'];

export const MODERATION_REGISTRY: WebhookRegistryEntry[] = [
  {
    id: 'moderation_engine_blocked',
    category: 'MODERATION',
    environments: ALL_ENVS,
    trigger: 'Send message content matching the Profanity filter rule',
    expectedEvent: 'moderation_engine_blocked',
    automationMethod: 'REST',
    expectedPayloadKeys: ['data.message.id', 'data.message.data.moderation.status', 'data.message.data.moderation.rule.id', 'data.moderation'],
    status: 'AUTOMATED',
    specFile: 'src/tests/moderation/moderation-engine-blocked.spec.ts',
    testTitleMatch: 'moderation_engine_blocked webhook fires when a message matches the Profanity filter',
  },
  {
    id: 'moderation_engine_approved',
    category: 'MODERATION',
    environments: ALL_ENVS,
    trigger: 'Send ordinary message content that clears moderation checks',
    expectedEvent: 'moderation_engine_approved',
    automationMethod: 'REST',
    expectedPayloadKeys: ['data.message.id', 'data.message.data.moderation.status'],
    status: 'AUTOMATED',
    specFile: 'src/tests/moderation/moderation-engine-approved.spec.ts',
    testTitleMatch: 'moderation_engine_approved webhook fires when a clean message clears moderation',
  },
  {
    id: 'moderation_manual_approved',
    category: 'MODERATION',
    environments: ALL_ENVS,
    trigger: 'A human admin manually approves flagged content in the Dashboard',
    expectedEvent: 'moderation_manual_approved',
    automationMethod: 'NONE',
    expectedPayloadKeys: [],
    status: 'BLOCKED',
    specFile: 'src/tests/moderation/moderation.spec.ts',
    testTitleMatch: 'moderation_manual_approved (documented gap)',
    reason: 'No REST or SDK equivalent exists for a human manually approving a flagged item — Dashboard-only action.',
  },
];
