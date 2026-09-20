/**
 * Switching a moderation rule on/off — the API equivalent of the Dashboard's
 * Moderation → Rules toggle. PUT needs the whole rule back, so we re-send
 * the rule as read with only `enabled` changed.
 */
import { getConfig } from '../config/env';
import { fetchWithRetry } from './http';

export interface FullRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  action: string[];
  filters?: unknown[];
  conditions: unknown[];
}

export interface RawResponse {
  status: number;
  body: any;
}

function baseUrl(): string {
  const { appId, region, adminHost } = getConfig();
  return adminHost ? `https://${adminHost}` : `https://${appId}.api-${region}.cometchat.io/v3`;
}

async function call(method: string, path: string, body?: unknown): Promise<RawResponse> {
  const { appId, restApiKey } = getConfig();
  const res = await fetchWithRetry(`${baseUrl()}${path}`, {
    method,
    headers: { appId, apiKey: restApiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function getRule(ruleId: string): Promise<FullRule> {
  const res = await call('GET', `/moderation/rules/${ruleId}`);
  if (res.status !== 200) throw new Error(`GET rule ${ruleId}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

/** Sets a rule's enabled flag and returns the raw API response (kept as test evidence). */
export async function setRuleEnabled(ruleId: string, enabled: boolean): Promise<RawResponse> {
  const r = await getRule(ruleId);
  const res = await call('PUT', `/moderation/rules/${ruleId}`, {
    id: r.id,
    name: r.name,
    description: r.description,
    enabled,
    action: r.action,
    filters: r.filters ?? [],
    conditions: r.conditions,
  });
  if (res.status !== 200) throw new Error(`PUT rule ${ruleId} enabled=${enabled}: ${res.status} ${JSON.stringify(res.body)}`);
  const after = await getRule(ruleId);
  if (after.enabled !== enabled) throw new Error(`Rule ${ruleId} still enabled=${after.enabled} after PUT`);
  return res;
}

export async function getKeywordList(listId: string): Promise<RawResponse> {
  return call('GET', `/moderation/keywords/${listId}`);
}
