/**
 * Low-level HTTP wrapper over CometChat's per-app REST Chat API
 * (https://api-explorer.cometchat.com). Every resource-specific client
 * (users/groups/messages) goes through this — no raw fetch() calls scattered
 * through client or test code.
 */
import { getConfig } from '../config/env';

function baseUrl(): string {
  const { appId, region, adminHost } = getConfig();
  if (adminHost) return `https://${adminHost}`;
  return `https://${appId}.api-${region}.cometchat.io/v3`;
}

function headers(): Record<string, string> {
  const { appId, restApiKey } = getConfig();
  return { appId, apiKey: restApiKey, 'Content-Type': 'application/json' };
}

export async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: extraHeaders ? { ...headers(), ...extraHeaders } : headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.data;
}

/**
 * Generates a client-side login credential for `uid` — used by tests that
 * need a real connected SDK client (WebSocket) rather than a server-side
 * REST call (group self-join/leave, delivery/read receipts, connection
 * status: none of these have a REST equivalent — verified live).
 */
export async function createAuthToken(uid: string): Promise<{ authToken: string }> {
  return apiRequest('POST', `/users/${uid}/auth_tokens`);
}
