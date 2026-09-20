/**
 * Moderator/admin REST calls used by the scenario suite: temporary rules and
 * keyword lists, moderator review of blocked/flagged messages, flag reasons,
 * and the user/group state that rule actions (kick, ban, block, deactivate)
 * change. Every call returns the raw status + body so it can be kept as evidence.
 */
import { getConfig } from '../config/env';
import { fetchWithRetry } from './http';

export interface Raw<T = any> {
  status: number;
  body: { data?: T; error?: any; [k: string]: any };
}

function baseUrl(): string {
  const { appId, region, adminHost } = getConfig();
  return adminHost ? `https://${adminHost}` : `https://${appId}.api-${region}.cometchat.io/v3`;
}

export async function call<T = any>(method: string, path: string, body?: unknown, extra?: Record<string, string>): Promise<Raw<T>> {
  const { appId, restApiKey } = getConfig();
  const res = await fetchWithRetry(`${baseUrl()}${path}`, {
    method,
    headers: { appId, apiKey: restApiKey, 'Content-Type': 'application/json', Accept: 'application/json', ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function ok<T = any>(p: Promise<Raw<T>>, what: string): Promise<Raw<T>> {
  const r = await p;
  if (r.status >= 300) throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.body.error ?? r.body).slice(0, 300)}`);
  return r;
}

// ---- Rules -----------------------------------------------------------------

export type RuleAction = 'blockMessage' | 'flagMessage' | 'kick' | 'block' | 'ban' | 'deactivate';

export interface RuleFilter {
  type: 'sender' | 'receiver';
  entity: 'user' | 'group';
  operand: string;
  operator: string;
  value: string;
}

export interface TempRuleSpec {
  id: string;
  action: RuleAction[];
  /** Text keyword(s) the rule matches, or a keyword-list id when `listRef` is true. */
  words?: string[];
  listRef?: boolean;
  /** Media condition instead of text (e.g. video + "Any unsafe content_greaterThan_30"). */
  media?: { operand: 'image' | 'video'; value: string };
  filters?: RuleFilter[];
  enabled?: boolean;
}

export async function createRule(spec: TempRuleSpec): Promise<Raw> {
  const condition = spec.media
    ? { id: 1, entity: 'message', operand: spec.media.operand, category: 'word', operator: 'contains', isKeywordsReferencePresent: false, isMediaPresent: true, value: [spec.media.value] }
    : { id: 1, entity: 'message', operand: 'text', category: 'word', operator: 'contains', isKeywordsReferencePresent: !!spec.listRef, isMediaPresent: false, value: spec.words ?? [] };
  return ok(
    call('POST', '/moderation/rules', {
      id: spec.id,
      name: `QA auto ${spec.id}`,
      description: 'Temporary rule created by moderation-automation; deleted after the test.',
      enabled: spec.enabled ?? true,
      action: spec.action,
      filters: spec.filters ?? [],
      conditions: [condition],
    }),
    `create rule ${spec.id}`
  );
}

export const deleteRule = (id: string) => call('DELETE', `/moderation/rules/${id}`);
export const ruleRevisions = (id: string) => call<any[]>('GET', `/moderation/rules/${id}/revisions`);

// ---- Keyword lists ------------------------------------------------------------

export const createKeywordList = (id: string, words: string[]) =>
  ok(call('POST', '/moderation/keywords', { id, name: `QA auto ${id}`, description: 'Temporary list created by moderation-automation.', category: 'word', searchTerms: words }), `create list ${id}`);
export const deleteKeywordList = (id: string) => call('DELETE', `/moderation/keywords/${id}`);

// ---- Moderator review -----------------------------------------------------------

/** "Approve" on a blocked message (Blocked Messages → Approve). */
export const approveBlocked = (messageId: string) => call('PATCH', `/moderation/blocked-messages/${messageId}`, { status: 'approved' });
/** Review a blocked message: approved | rejected. */
export const reviewBlocked = (messageId: string, status: 'approved' | 'rejected') =>
  call('PATCH', `/moderation/blocked-messages/${messageId}`, { status, reviewed: true });
/** Flagged Messages → Approve (keep) or Block (disapprove). */
export const reviewFlagged = (messageId: string, status: 'approved' | 'disapproved') =>
  call('PATCH', `/moderation/flagged-messages/${messageId}`, { status });
export const listReviewed = () => call<any[]>('GET', '/moderation/reviewed-messages?limit=100');

// ---- Flag reasons -----------------------------------------------------------------

export const createReason = (id: string, name: string) =>
  ok(call('POST', '/moderation/reasons', { id, name, description: 'Temporary reason created by moderation-automation.' }), `create reason ${id}`);
export const deleteReason = (id: string) => call('DELETE', `/moderation/reasons/${id}`);

// ---- Users & groups (state changed by rule actions) ---------------------------------

export const getUser = (uid: string) => call('GET', `/users/${uid}`);
export const reactivateUser = (uid: string) => call('PUT', '/users', { uidsToActivate: [uid] });
export const blockedUsersOf = (uid: string) => call<any[]>('GET', `/users/${uid}/blockedusers`);

export async function createGroup(guid: string, name: string, ownerUid: string, memberUids: string[]): Promise<Raw> {
  await ok(call('POST', '/groups', { guid, name, type: 'public', owner: ownerUid }), `create group ${guid}`);
  return ok(call('POST', `/groups/${guid}/members`, { participants: memberUids }), `add members to ${guid}`);
}
export const deleteGroup = (guid: string) => call('DELETE', `/groups/${guid}`);
export const groupMembers = (guid: string) => call<any[]>('GET', `/groups/${guid}/members?perPage=100`);
export const bannedMembers = (guid: string) => call<any[]>('GET', `/groups/${guid}/bannedusers`);
export const getMessage = (id: string) => call('GET', `/messages/${id}`);

// ---- Leftovers from interrupted runs -------------------------------------------------

/**
 * Deletes temporary objects an interrupted scenario run may have left behind
 * (identified by the prefixes only this suite uses). Returns what was removed.
 */
export async function sweepLeftovers(): Promise<string[]> {
  const removed: string[] = [];
  const ids = async (path: string, key: string) => ((await call<any[]>('GET', path)).body.data ?? []).map((x: any) => String(x[key]));
  for (const id of (await ids('/moderation/rules', 'id')).filter((i) => i.startsWith('qascn'))) {
    await deleteRule(id);
    removed.push(`rule ${id}`);
  }
  for (const id of (await ids('/moderation/keywords', 'id')).filter((i) => i.startsWith('qalist'))) {
    await deleteKeywordList(id);
    removed.push(`list ${id}`);
  }
  for (const id of (await ids('/moderation/reasons', 'id')).filter((i) => i.startsWith('qareason'))) {
    await deleteReason(id);
    removed.push(`reason ${id}`);
  }
  for (const guid of (await ids('/groups?searchKey=qa-grp-&perPage=100', 'guid')).filter((g) => g.startsWith('qa-grp-'))) {
    await deleteGroup(guid);
    removed.push(`group ${guid}`);
  }
  // Test users from every suite in this project (patterns tight enough to never match a real user).
  const TEST_UID = [/^modscn-/, /^modtoggle-/, /^mod-[a-z0-9]+-(alice|bob)$/, /^preflight-[a-z0-9]+$/, /^probe-[a-z0-9]+-[ab]$/];
  for (const key of ['modscn-', 'modtoggle-', 'mod-', 'preflight-', 'probe-']) {
    for (const uid of (await ids(`/users?searchKey=${key}&perPage=100`, 'uid')).filter((u) => TEST_UID.some((re) => re.test(u)))) {
      if (removed.includes(`user ${uid}`)) continue;
      await call('DELETE', `/users/${uid}`, { permanent: true });
      removed.push(`user ${uid}`);
    }
  }
  return removed;
}
