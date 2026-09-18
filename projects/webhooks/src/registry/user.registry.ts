import { WebhookRegistryEntry } from './webhook.registry';
import { AppEnvName } from '../config/config.schema';

const ALL_ENVS: AppEnvName[] = ['staging-us', 'prod-us', 'prod-eu', 'prod-in'];

export const USER_REGISTRY: WebhookRegistryEntry[] = [
  {
    id: 'user_blocked',
    category: 'USER',
    environments: ALL_ENVS,
    trigger: 'Block a user',
    expectedEvent: 'user_blocked',
    automationMethod: 'REST',
    expectedPayloadKeys: ['data.by', 'data.users'],
    status: 'AUTOMATED',
    specFile: 'src/tests/user/user-blocked.spec.ts',
    testTitleMatch: 'user_blocked webhook fires with the correct blocker and blocked user',
  },
  {
    id: 'user_unblocked',
    category: 'USER',
    environments: ALL_ENVS,
    trigger: 'Unblock a user',
    expectedEvent: 'user_unblocked',
    automationMethod: 'REST',
    expectedPayloadKeys: ['data.by', 'data.users'],
    status: 'AUTOMATED',
    specFile: 'src/tests/user/user-unblocked.spec.ts',
    testTitleMatch: 'user_unblocked webhook fires with the correct unblocker and unblocked user',
  },
  {
    id: 'user_connection_status_changed',
    category: 'USER',
    environments: ALL_ENVS,
    trigger: 'A real SDK client connects/disconnects (no REST equivalent)',
    expectedEvent: 'user_connection_status_changed',
    automationMethod: 'SDK',
    expectedPayloadKeys: ['data.status', 'data.user.uid', 'data.currentConnection.action'],
    status: 'AUTOMATED',
    specFile: 'src/tests/user/user-connection-status-changed.spec.ts',
    testTitleMatch: 'user_connection_status_changed webhook fires when a client disconnects',
  },
];
