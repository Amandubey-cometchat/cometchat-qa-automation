/**
 * REST access used only for test setup/cleanup and for checking results the
 * UI can't show (the app's Moderation lists). Every user-facing action in a
 * test goes through the sample app's UI via the page objects instead.
 */
import { getConfig } from '../config/env';
import { fetchWithRetry } from './http';

function baseUrl(): string {
  const { appId, region, adminHost } = getConfig();
  return adminHost ? `https://${adminHost}` : `https://${appId}.api-${region}.cometchat.io/v3`;
}

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const { appId, restApiKey } = getConfig();
  const res = await fetchWithRetry(`${baseUrl()}${path}`, {
    method,
    headers: { appId, apiKey: restApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data;
}

export interface TestUser {
  uid: string;
  name: string;
}

export async function createUser(user: TestUser): Promise<void> {
  await request('POST', '/users', user);
}

export async function deleteUser(uid: string): Promise<void> {
  await request('DELETE', `/users/${uid}`, { permanent: true });
}

export interface ModerationRule {
  id: string;
  name: string;
  enabled: boolean;
  action: string[];
}

export async function listRules(): Promise<ModerationRule[]> {
  return request('GET', '/moderation/rules');
}

export async function isRuleEnabled(ruleId: string): Promise<boolean> {
  const rules = await listRules();
  return rules.some((r) => r.id === ruleId && r.enabled);
}

export interface BlockedMessage {
  ruleId: string;
  ruleName: string;
  action: string[];
  message: { id: string; sender: string; receiver: string; receiverType: string; data: { text?: string } };
}

export async function listBlockedMessages(): Promise<BlockedMessage[]> {
  return request('GET', '/moderation/blocked-messages');
}

export interface FlaggedMessage {
  id: string;
  sender: string;
  receiver: string;
  data: { text?: string };
  flaggedBy: { uid: string; reasonId: string; reasonName: string; remark?: string; flaggedAt: number }[];
  flaggedCount: number;
}

export async function listFlaggedMessages(limit = 100): Promise<FlaggedMessage[]> {
  return request('GET', `/moderation/flagged-messages?limit=${limit}`);
}
