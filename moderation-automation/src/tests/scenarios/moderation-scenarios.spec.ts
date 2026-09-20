/**
 * Moderation scenarios beyond simple on/off toggles: rule actions (flag, block
 * user, kick, ban, deactivate), group chats, sender filters, custom keyword
 * lists, moderator review of blocked and flagged messages, report reasons,
 * edited messages and rule revision history.
 *
 * Isolation: every scenario creates its OWN temporary rule matching a private
 * made-up keyword (plus its own users/group/list/reason) and deletes all of it
 * afterwards — the app's real rules are never changed. Every user action goes
 * through the React sample app's UI; the REST API only sets up, performs the
 * moderator's action, and reads back the result.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, Browser, BrowserContext, Page } from '@playwright/test';
import { getConfig } from '../../config/env';
import { createUser, deleteUser, listBlockedMessages, listFlaggedMessages, TestUser } from '../../api/cometchat.api';
import { setRuleEnabled } from '../../api/rules.api';
import * as admin from '../../api/moderation-admin.api';
import { LoginPage } from '../../pages/login.page';
import { HomePage } from '../../pages/home.page';
import { ChatPage, SendResult } from '../../pages/chat.page';
import { ApiEvidence, CaseResult, Check, EvidenceRecorder } from '../../toggles/evidence';

test.describe.configure({ mode: 'serial', timeout: 300_000 });

const ROOT = path.resolve(__dirname, '../../..');
const RULE_PROPAGATION_MS = 8_000;
const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const short = Date.now().toString(36);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let recorder: EvidenceRecorder;
let browserRef: Browser;

test.beforeAll(async ({ browser }) => {
  browserRef = browser;
  const cfg = getConfig();
  const swept = await admin.sweepLeftovers();
  recorder = new EvidenceRecorder(path.join(ROOT, 'reports/scenario-run'), {
    runId,
    appEnv: cfg.appEnv,
    appId: cfg.appId,
    startedAt: new Date().toISOString(),
    sampleAppCommit: fs.readFileSync(path.join(ROOT, 'sample-app/.pinned-commit'), 'utf8').trim(),
    isolation:
      "Each scenario creates its own temporary rule on a private keyword (and its own users, group, list or reason) and deletes it afterwards; the app's real rules are not changed.",
    notes: [
      'User actions (send, edit, report) go through the React sample app UI. Moderator actions (approve/reject/block) use the Moderation REST API — the same actions as the Dashboard buttons.',
      `Each new rule waits ${RULE_PROPAGATION_MS / 1000}s before sending.`,
      `Leftovers from earlier interrupted runs removed before starting: ${swept.length ? swept.join(', ') : 'none'}.`,
      'API calls retry up to 3 times on network errors (no response); HTTP error responses are never retried.',
    ],
  });
});

test.afterAll(async () => {
  recorder.info.finishedAt = new Date().toISOString();
  recorder.flush();
});

// ---------------------------------------------------------------------------
// Scenario harness
// ---------------------------------------------------------------------------

interface Actor {
  user: TestUser;
  context: BrowserContext;
  page: Page;
  home: HomePage;
  chat?: ChatPage;
}

class Scenario {
  readonly checks: Check[] = [];
  readonly apis: ApiEvidence[] = [];
  readonly screenshots: Record<string, string> = {};
  readonly kw: string;
  readonly tag: string;
  private readonly cleanups: (() => Promise<unknown>)[] = [];
  private readonly actors: { role: string; page: Page }[] = [];
  message = '';
  expected = '';
  finding?: string;
  blockedEntry: CaseResult['blockedEntry'] = null;
  delivered?: boolean;
  senderNotice?: boolean;
  sendApi?: { status: number; body: unknown };

  constructor(
    readonly id: string,
    readonly area: string,
    readonly title: string
  ) {
    const code = id.replace(/^SCN-/, '').replace(/-/g, '').toLowerCase();
    // Letters only — can't trip the phone-number / email pattern rules.
    this.kw = `zq${code}${short.replace(/[0-9]/g, '')}`;
    this.tag = `[${id} ${short}]`;
  }

  get ruleId() {
    return `qa${this.id.replace(/[^A-Za-z0-9]/g, '').toLowerCase()}${short}`;
  }

  onCleanup(fn: () => Promise<unknown>) {
    this.cleanups.push(fn);
  }

  check(label: string, pass: boolean, detail?: string) {
    this.checks.push({ label, pass, detail });
  }

  /** Keeps an API call as evidence (very large bodies are truncated for the report). */
  api<T extends { status: number; body: unknown }>(label: string, raw: T): T {
    const text = JSON.stringify(raw.body) ?? '';
    this.apis.push({ label, status: raw.status, body: text.length > 6000 ? { truncated: `${text.slice(0, 6000)}…` } : raw.body });
    return raw;
  }

  async shot(label: string, page: Page) {
    const s = recorder.shot(this.id, label);
    await page.screenshot({ path: s.abs });
    this.screenshots[label] = s.rel;
  }

  async actor(role: string): Promise<Actor> {
    const user = { uid: `modscn-${short}-${this.id.toLowerCase().replace(/[^a-z0-9]/g, '')}-${role}`, name: `Scn ${this.id.replace('SCN-', '')} ${role} ${short}` };
    await createUser(user);
    this.onCleanup(() => deleteUser(user.uid).catch(() => undefined));
    const context = await browserRef.newContext({ viewport: { width: 1400, height: 850 } });
    this.onCleanup(() => context.close().catch(() => undefined));
    const page = await context.newPage();
    this.actors.push({ role, page });
    const home = await new LoginPage(page).loginAs(user.uid);
    return { user, context, page, home };
  }

  /** alice ↔ bob 1-on-1, both chats open. */
  async oneToOne(): Promise<{ alice: Actor; bob: Actor }> {
    const alice = await this.actor('alice');
    const bob = await this.actor('bob');
    alice.chat = await alice.home.openUserChat(bob.user.name);
    bob.chat = await bob.home.openUserChat(alice.user.name);
    return { alice, bob };
  }

  /** A public group owned by `ownerRole`, with the other roles as members; everyone has it open. */
  async group(roles: string[], ownerRole: string): Promise<{ actors: Record<string, Actor>; guid: string; name: string }> {
    const actors: Record<string, Actor> = {};
    for (const r of roles) actors[r] = await this.actor(r);
    const guid = `qa-grp-${short}-${this.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const name = `Scn group ${this.id.replace('SCN-', '')} ${short}`;
    this.api(
      'Create group',
      await admin.createGroup(guid, name, actors[ownerRole].user.uid, roles.filter((r) => r !== ownerRole).map((r) => actors[r].user.uid))
    );
    this.onCleanup(() => admin.deleteGroup(guid));
    for (const r of roles) actors[r].chat = await actors[r].home.openGroupChat(name);
    return { actors, guid, name };
  }

  async rule(spec: Omit<admin.TempRuleSpec, 'id'>) {
    this.api('Create temporary rule', await admin.createRule({ id: this.ruleId, ...spec }));
    this.onCleanup(() => admin.deleteRule(this.ruleId));
    await sleep(RULE_PROPAGATION_MS);
  }

  /** On an unexpected error, capture every user's screen so the failure can be diagnosed. */
  async captureError() {
    for (const a of this.actors) await this.shot(`error-${a.role}`, a.page).catch(() => undefined);
  }

  async cleanup() {
    for (const fn of this.cleanups.reverse()) await fn().catch(() => undefined);
  }

  result(startedAt: number, error?: Error): CaseResult {
    if (error) this.check('Scenario ran to completion', false, error.message.split('\n')[0]);
    const failed = this.checks.filter((c) => !c.pass);
    return {
      id: this.id,
      area: this.area,
      title: this.title,
      ruleId: this.ruleId,
      ruleName: this.title,
      state: 'N/A',
      kind: 'scenario',
      message: this.message,
      expected: this.expected,
      actual: this.checks.map((c) => `${c.pass ? '✓' : '✗'} ${c.label}`).join('; '),
      checks: this.checks,
      apis: this.apis,
      sendApi: this.sendApi,
      blockedEntry: this.blockedEntry,
      deliveredToReceiver: this.delivered,
      senderBlockedNotice: this.senderNotice,
      screenshots: this.screenshots,
      status: failed.length || !this.checks.length ? 'FAIL' : 'PASS',
      bug: failed.length ? failed.map((c) => `${c.label}${c.detail ? ` (${c.detail})` : ''}`).join('; ') : undefined,
      finding: this.finding,
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  }
}

async function findBlocked(send: SendResult, text: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = (await listBlockedMessages()).find((b) =>
      send.messageId ? String(b.message.id) === String(send.messageId) : b.message.data?.text === text
    );
    if (hit) return { ruleId: hit.ruleId, ruleName: hit.ruleName, action: hit.action };
    await sleep(2_000);
  }
  return null;
}

async function findFlagged(messageId: string | undefined, text: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = (await listFlaggedMessages()).find((m) => (messageId ? String(m.id) === String(messageId) : m.data?.text === text));
    if (hit) return hit;
    await sleep(2_000);
  }
  return undefined;
}

const sees = (chat: ChatPage, text: string, timeout: number) =>
  chat.bubble(text).waitFor({ timeout }).then(() => true, () => false);

async function noticeShown(chat: ChatPage, before: number, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await chat.blockedNoticeCount()) > before) return true;
    await sleep(500);
  }
  return false;
}

/** Reload a page and reopen a 1-on-1 or group chat — shows server state rather than live events. */
async function reopen(actor: Actor, peer: { user?: string; group?: string }) {
  await actor.page.reload();
  await actor.home.conversations.waitFor({ timeout: 60_000 });
  actor.chat = peer.group ? await actor.home.openGroupChat(peer.group) : await actor.home.openUserChat(peer.user!);
  await sleep(3_000);
}

/** Sends `text` from `from` and verifies it is blocked by this scenario's rule and never reaches `to`. */
async function sendExpectBlocked(scn: Scenario, from: Actor, to: Actor, text: string, opts: { followUp?: boolean } = {}) {
  const noticesBefore = await from.chat!.blockedNoticeCount();
  await scn.shot('before', from.page);
  const send = await from.chat!.sendText(text);
  scn.sendApi = { status: send.status, body: send.body };
  scn.blockedEntry = await findBlocked(send, text);
  scn.check(`Blocked by ${scn.ruleId}`, scn.blockedEntry?.ruleId === scn.ruleId, scn.blockedEntry ? `blocked by ${scn.blockedEntry.ruleId}` : 'no Blocked Messages entry');
  if (opts.followUp !== false) {
    const followUp = `follow-up check ${scn.tag}`;
    await from.chat!.sendText(followUp);
    scn.check('Receiver chat is live (clean follow-up arrives)', await sees(to.chat!, followUp, 20_000));
  }
  scn.delivered = await sees(to.chat!, text, 3_000);
  scn.check('Receiver never sees the blocked message', !scn.delivered);
  scn.senderNotice = await noticeShown(from.chat!, noticesBefore);
  scn.check('Sender sees "blocked due to moderation" notice', scn.senderNotice);
  await scn.shot('after-sender', from.page);
  await scn.shot('after-receiver', to.page);
  return send;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

type ScenarioFn = (scn: Scenario) => Promise<void>;
const SCENARIOS: { id: string; area: string; title: string; run: ScenarioFn }[] = [];
const scenario = (id: string, area: string, title: string, run: ScenarioFn) => SCENARIOS.push({ id, area, title, run });

// ---- Group chats ------------------------------------------------------------------

scenario('SCN-GRP-BLOCK', 'Group chats', 'Blocked content in a group message', async (scn) => {
  scn.expected = 'Group message with the keyword is blocked by the rule; other members never see it; sender sees the notice';
  await scn.rule({ action: ['blockMessage'], words: [scn.kw] });
  const { actors } = await scn.group(['alice', 'bob'], 'bob');
  scn.message = `group message ${scn.kw} ${scn.tag}`;
  await sendExpectBlocked(scn, actors.alice, actors.bob, scn.message);
});

// ---- Rule actions ------------------------------------------------------------------

scenario('SCN-ACT-FLAG', 'Rule actions', 'Action "Flag" delivers the message and queues it for review', async (scn) => {
  scn.expected = 'Message is delivered (not blocked) and appears in Flagged Messages; sender sees no blocked notice';
  await scn.rule({ action: ['flagMessage'], words: [scn.kw] });
  const { alice, bob } = await scn.oneToOne();
  scn.message = `borderline message ${scn.kw} ${scn.tag}`;
  const noticesBefore = await alice.chat!.blockedNoticeCount();
  await scn.shot('before', alice.page);
  const send = await alice.chat!.sendText(scn.message);
  scn.sendApi = { status: send.status, body: send.body };
  scn.delivered = await sees(bob.chat!, scn.message, 20_000);
  scn.check('Receiver gets the message', scn.delivered);
  const flagged = await findFlagged(send.messageId, scn.message);
  scn.check('Listed in Flagged Messages', !!flagged, flagged ? `flaggedCount ${flagged.flaggedCount}` : 'not found');
  if (flagged) scn.api('Flagged Messages entry', { status: 200, body: flagged });
  scn.blockedEntry = await findBlocked(send, scn.message, 8_000);
  scn.check('Not in Blocked Messages', !scn.blockedEntry);
  scn.senderNotice = await noticeShown(alice.chat!, noticesBefore, 3_000);
  scn.check('Sender sees no blocked notice', !scn.senderNotice);
  await scn.shot('after-sender', alice.page);
  await scn.shot('after-receiver', bob.page);
});

scenario('SCN-ACT-BLOCKUSER', 'Rule actions', 'Action "Block user" in a 1-on-1 chat', async (scn) => {
  scn.expected = 'Message is blocked and a user block is created between sender and receiver';
  await scn.rule({ action: ['blockMessage', 'block'], words: [scn.kw] });
  const { alice, bob } = await scn.oneToOne();
  scn.message = `rude message ${scn.kw} ${scn.tag}`;
  // No live-chat follow-up here: once the block exists, later messages are *meant* to stop.
  await sendExpectBlocked(scn, alice, bob, scn.message, { followUp: false });
  const has = (r: admin.Raw<any[]>, uid: string) => (r.body.data ?? []).some((u: any) => u.uid === uid);
  let relation = '';
  let byBob!: admin.Raw<any[]>;
  let byAlice!: admin.Raw<any[]>;
  for (let i = 0; i < 10 && !relation; i++) {
    byBob = await admin.blockedUsersOf(bob.user.uid);
    byAlice = await admin.blockedUsersOf(alice.user.uid);
    if (has(byBob, alice.user.uid)) relation = 'receiver has blocked the sender';
    else if (has(byAlice, bob.user.uid)) relation = 'sender is recorded as blocking the receiver';
    else await sleep(2_000);
  }
  scn.api("Receiver's blocked-users list", byBob);
  scn.api("Sender's blocked-users list", byAlice);
  scn.check('A user block now exists between them', !!relation, relation || 'no block found in either user\'s blocked list after 20s');
  const later = `a later, harmless message ${scn.tag}`;
  await alice.chat!.sendText(later);
  scn.check('Later harmless messages from the sender no longer reach the receiver', !(await sees(bob.chat!, later, 10_000)));
  await scn.shot('after-block-sender', alice.page);
});

for (const [code, action, verb] of [
  ['KICK', 'kick', 'kicked from'],
  ['BAN', 'ban', 'banned from'],
] as const) {
  scenario(`SCN-ACT-${code}`, 'Rule actions', `Action "${action === 'kick' ? 'Kick' : 'Ban'} user" in a group`, async (scn) => {
    scn.expected = `Message is blocked and the sender is ${verb} the group`;
    await scn.rule({ action: ['blockMessage', action], words: [scn.kw] });
    const { actors, guid } = await scn.group(['alice', 'bob'], 'bob');
    scn.message = `group message ${scn.kw} ${scn.tag}`;
    await sendExpectBlocked(scn, actors.alice, actors.bob, scn.message, { followUp: false });
    let isMember = true;
    let isBanned = false;
    for (let i = 0; i < 10; i++) {
      const members = await admin.groupMembers(guid);
      const banned = await admin.bannedMembers(guid);
      isMember = (members.body.data ?? []).some((m: any) => m.uid === actors.alice.user.uid);
      isBanned = (banned.body.data ?? []).some((m: any) => m.uid === actors.alice.user.uid);
      if (i === 9 || !isMember) {
        scn.api('Group members', members);
        scn.api('Banned members', banned);
        break;
      }
      await sleep(2_000);
    }
    scn.check('Sender is no longer a group member', !isMember);
    if (action === 'ban') scn.check('Sender is in the group\'s banned list', isBanned);
    else scn.check('Sender is not banned (kick only)', !isBanned);
    await sleep(2_000);
    await scn.shot(`after-${action}-sender`, actors.alice.page);
  });
}

scenario('SCN-ACT-DEACTIVATE', 'Rule actions', 'Action "Deactivate" (undocumented action value)', async (scn) => {
  scn.expected = "Message is blocked and the sender's account is deactivated";
  await scn.rule({ action: ['blockMessage', 'deactivate'], words: [scn.kw] });
  const { alice, bob } = await scn.oneToOne();
  scn.onCleanup(() => admin.reactivateUser(alice.user.uid));
  scn.message = `rule breaking message ${scn.kw} ${scn.tag}`;
  await sendExpectBlocked(scn, alice, bob, scn.message, { followUp: false });
  let deactivated = false;
  let last: admin.Raw | undefined;
  const t0 = Date.now();
  for (let i = 0; i < 45 && !deactivated; i++) {
    last = await admin.getUser(alice.user.uid);
    deactivated = last.status === 404 || !!(last.body.data as any)?.deactivatedAt;
    if (!deactivated) await sleep(2_000);
  }
  if (last) scn.api('Sender account after violation', last);
  const secs = Math.round((Date.now() - t0) / 1000);
  scn.check("Sender's account is deactivated", deactivated, deactivated ? `deactivated about ${secs}s after the message` : `still active after ${secs}s`);
  if (deactivated && secs > 15) scn.finding = `The "deactivate" action is delayed: the account was deactivated about ${secs}s after the violating message, not immediately.`;
  await sleep(2_000);
  await scn.shot('after-deactivate-sender', alice.page);
});

// ---- Filters -----------------------------------------------------------------------

scenario('SCN-FLT-SENDER', 'Filters', 'Rule limited to one sender (sender UID filter)', async (scn) => {
  scn.expected = "Filtered sender's message is blocked; the same content from another user is delivered";
  const alice = await scn.actor('alice');
  const bob = await scn.actor('bob');
  await scn.rule({
    action: ['blockMessage'],
    words: [scn.kw],
    filters: [{ type: 'sender', entity: 'user', operand: 'uid', operator: 'equals', value: alice.user.uid }],
  });
  alice.chat = await alice.home.openUserChat(bob.user.name);
  bob.chat = await bob.home.openUserChat(alice.user.name);
  scn.message = `filtered content ${scn.kw} ${scn.tag}`;
  await sendExpectBlocked(scn, alice, bob, scn.message);

  const fromBob = `filtered content ${scn.kw} from bob ${scn.tag}`;
  const send = await bob.chat.sendText(fromBob);
  scn.api('Unfiltered sender: send response', { status: send.status, body: send.body });
  scn.check('Same content from another sender is delivered', await sees(alice.chat, fromBob, 20_000));
  scn.check('…and not blocked', !(await findBlocked(send, fromBob, 8_000)));
  await scn.shot('after-unfiltered-receiver', alice.page);
});

// ---- Custom keyword lists ------------------------------------------------------------

scenario('SCN-LIST-CUSTOM', 'Custom lists', 'New keyword list referenced by a new rule', async (scn) => {
  scn.expected = 'A word from the new list is blocked by the rule that references the list';
  const listId = `qalist${short}`;
  scn.api('Create keyword list', await admin.createKeywordList(listId, [scn.kw]));
  scn.onCleanup(() => admin.deleteKeywordList(listId));
  await scn.rule({ action: ['blockMessage'], words: [listId], listRef: true });
  const { alice, bob } = await scn.oneToOne();
  scn.message = `list word ${scn.kw} ${scn.tag}`;
  await sendExpectBlocked(scn, alice, bob, scn.message);
});

// ---- Moderator review ----------------------------------------------------------------

scenario('SCN-REV-APPROVE-BLOCKED', 'Moderator review', 'Approve a blocked message', async (scn) => {
  scn.expected = 'After approval the message reaches the receiver and appears in Reviewed Messages';
  await scn.rule({ action: ['blockMessage'], words: [scn.kw] });
  const { alice, bob } = await scn.oneToOne();
  scn.message = `false positive ${scn.kw} ${scn.tag}`;
  const send = await sendExpectBlocked(scn, alice, bob, scn.message, { followUp: false });
  const res = scn.api('Approve blocked message (PATCH status=approved)', await admin.approveBlocked(send.messageId!));
  scn.check('Approve API succeeds', res.status < 300, `HTTP ${res.status}`);
  const live = await sees(bob.chat!, scn.message, 15_000);
  if (!live) await reopen(bob, { user: alice.user.name });
  const afterReload = live || (await sees(bob.chat!, scn.message, 5_000));
  scn.check('Receiver sees the approved message', afterReload, live ? 'arrived live' : afterReload ? 'visible after reload' : 'not visible even after reload');
  const reviewed = scn.api('Reviewed Messages', await admin.listReviewed());
  scn.check('Listed in Reviewed Messages', JSON.stringify(reviewed.body).includes(`"${send.messageId}"`));
  scn.api('Message after approval', await admin.getMessage(send.messageId!));
  await scn.shot('after-approve-receiver', bob.page);
  await scn.shot('after-approve-sender', alice.page);
});

scenario('SCN-REV-REJECT-BLOCKED', 'Moderator review', 'Reject a blocked message', async (scn) => {
  scn.expected = 'After rejection the message stays hidden from the receiver and appears in Reviewed Messages';
  await scn.rule({ action: ['blockMessage'], words: [scn.kw] });
  const { alice, bob } = await scn.oneToOne();
  scn.message = `confirmed violation ${scn.kw} ${scn.tag}`;
  const send = await sendExpectBlocked(scn, alice, bob, scn.message, { followUp: false });
  const res = scn.api('Review blocked message (PATCH status=rejected, reviewed=true)', await admin.reviewBlocked(send.messageId!, 'rejected'));
  scn.check('Reject API succeeds', res.status < 300, `HTTP ${res.status}`);
  await reopen(bob, { user: alice.user.name });
  scn.check('Receiver still does not see it (after reload)', !(await sees(bob.chat!, scn.message, 5_000)));
  const reviewed = scn.api('Reviewed Messages', await admin.listReviewed());
  scn.check('Listed in Reviewed Messages', JSON.stringify(reviewed.body).includes(`"${send.messageId}"`));
  await scn.shot('after-reject-receiver', bob.page);
});

for (const [code, status, keep] of [
  ['APPROVE-FLAGGED', 'approved', true],
  ['BLOCK-FLAGGED', 'disapproved', false],
] as const) {
  scenario(`SCN-REV-${code}`, 'Moderator review', keep ? 'Approve a reported (flagged) message' : 'Block a reported (flagged) message', async (scn) => {
    scn.expected = keep
      ? 'Approved message stays visible, leaves the Flagged queue and appears in Reviewed Messages'
      : 'Blocked message is hidden from the conversation, leaves the Flagged queue and appears in Reviewed Messages';
    const { alice, bob } = await scn.oneToOne();
    scn.message = `reported message ${scn.tag}`;
    await scn.shot('before', alice.page);
    const send = await alice.chat!.sendText(scn.message);
    scn.sendApi = { status: send.status, body: send.body };
    scn.check('Receiver gets the message', await sees(bob.chat!, scn.message, 20_000));
    await (await bob.chat!.reportMessage(scn.message)).submit('Spam', `automation ${scn.tag}`);
    const flagged = await findFlagged(send.messageId, scn.message);
    scn.check('Report puts it in Flagged Messages', !!flagged);

    const res = scn.api(`Review flagged message (PATCH status=${status})`, await admin.reviewFlagged(send.messageId!, status));
    scn.check(`${keep ? 'Approve' : 'Block'} API succeeds`, res.status < 300, `HTTP ${res.status}`);
    await sleep(5_000);
    const stillQueued = (await listFlaggedMessages()).some((m) => String(m.id) === String(send.messageId));
    scn.check('Removed from the Flagged queue', !stillQueued);
    const reviewed = scn.api('Reviewed Messages', await admin.listReviewed());
    scn.check('Listed in Reviewed Messages', JSON.stringify(reviewed.body).includes(`"${send.messageId}"`));

    await reopen(bob, { user: alice.user.name });
    const visible = await sees(bob.chat!, scn.message, 5_000);
    scn.delivered = visible;
    scn.check(keep ? 'Still visible to the receiver (after reload)' : 'Hidden from the receiver (after reload)', keep ? visible : !visible);
    scn.api('Message after review', await admin.getMessage(send.messageId!));
    await scn.shot('after-review-receiver', bob.page);
    await reopen(alice, { user: bob.user.name });
    await scn.shot('after-review-sender', alice.page);
  });
}

// ---- Report reasons -------------------------------------------------------------------

for (const [code, label, reasonId] of [
  ['SEXUAL', 'Sexual Content', 'sexual'],
  ['HARASS', 'Harassment / Bullying', 'harassment'],
] as const) {
  scenario(`SCN-RSN-${code}`, 'Report reasons', `Report with reason "${label}"`, async (scn) => {
    scn.expected = `Flagged Messages records the reporter with reason "${reasonId}" and the remark`;
    const { alice, bob } = await scn.oneToOne();
    scn.message = `please check this ${scn.tag}`;
    const remark = `remark ${scn.tag}`;
    const send = await alice.chat!.sendText(scn.message);
    scn.sendApi = { status: send.status, body: send.body };
    await sees(bob.chat!, scn.message, 20_000);
    await scn.shot('before', bob.page);
    const dialog = await bob.chat!.reportMessage(scn.message);
    await scn.shot('report-dialog', bob.page);
    await dialog.submit(label, remark);
    const flagged = await findFlagged(send.messageId, scn.message);
    if (flagged) scn.api('Flagged Messages entry', { status: 200, body: flagged });
    const by = flagged?.flaggedBy.find((f) => f.uid === bob.user.uid);
    scn.check('Listed in Flagged Messages', !!flagged);
    scn.check(`Reason recorded as "${reasonId}"`, by?.reasonId === reasonId, by ? `got "${by.reasonId}"` : undefined);
    scn.check('Remark recorded', by?.remark === remark);
    await scn.shot('after-receiver', bob.page);
  });
}

scenario('SCN-RSN-TWO-REPORTERS', 'Report reasons', 'Two members report the same group message', async (scn) => {
  scn.expected = 'Flagged Messages shows flaggedCount 2 with both reporters and their own reasons';
  const { actors } = await scn.group(['alice', 'bob', 'carol'], 'bob');
  scn.message = `group message to report ${scn.tag}`;
  const send = await actors.alice.chat!.sendText(scn.message);
  scn.sendApi = { status: send.status, body: send.body };
  await sees(actors.bob.chat!, scn.message, 20_000);
  await sees(actors.carol.chat!, scn.message, 20_000);
  await (await actors.bob.chat!.reportMessage(scn.message)).submit('Spam', `bob ${scn.tag}`);
  await (await actors.carol.chat!.reportMessage(scn.message)).submit('Harassment / Bullying', `carol ${scn.tag}`);
  let flagged: Awaited<ReturnType<typeof findFlagged>>;
  for (let i = 0; i < 10; i++) {
    flagged = await findFlagged(send.messageId, scn.message, 5_000);
    if ((flagged?.flaggedCount ?? 0) >= 2) break;
    await sleep(2_000);
  }
  if (flagged) scn.api('Flagged Messages entry', { status: 200, body: flagged });
  scn.check('flaggedCount is 2', flagged?.flaggedCount === 2, `got ${flagged?.flaggedCount}`);
  const reasons = Object.fromEntries((flagged?.flaggedBy ?? []).map((f) => [f.uid, f.reasonId]));
  scn.check('Both reporters recorded with their own reasons', reasons[actors.bob.user.uid] === 'spam' && reasons[actors.carol.user.uid] === 'harassment', JSON.stringify(reasons));
  await scn.shot('after-carol', actors.carol.page);
});

scenario('SCN-RSN-CUSTOM', 'Report reasons', 'A new custom report reason appears in the Report dialog and can be used', async (scn) => {
  const reasonId = `qareason${short.replace(/[0-9]/g, '')}`;
  const label = `QA reason ${short}`;
  scn.expected = `The new reason "${label}" is offered in the Report dialog and is recorded when chosen`;
  scn.api('Create custom reason', await admin.createReason(reasonId, label));
  scn.onCleanup(() => admin.deleteReason(reasonId));
  const { alice, bob } = await scn.oneToOne();
  scn.message = `custom reason target ${scn.tag}`;
  const send = await alice.chat!.sendText(scn.message);
  scn.sendApi = { status: send.status, body: send.body };
  await sees(bob.chat!, scn.message, 20_000);
  const dialog = await bob.chat!.reportMessage(scn.message);
  await scn.shot('report-dialog', bob.page);
  const offered = await dialog.reason(label).isVisible();
  scn.check('Custom reason is offered in the Report dialog', offered);
  if (!offered) return;
  await dialog.submit(label, `custom ${scn.tag}`);
  const flagged = await findFlagged(send.messageId, scn.message);
  if (flagged) scn.api('Flagged Messages entry', { status: 200, body: flagged });
  const by = flagged?.flaggedBy.find((f) => f.uid === bob.user.uid);
  scn.check(`Reason recorded as "${reasonId}"`, by?.reasonId === reasonId, by ? `got "${by.reasonId}"` : 'not flagged');
});

// ---- Edited messages -------------------------------------------------------------------

scenario('SCN-EDIT', 'Edited messages', 'Editing a clean message to add blocked content', async (scn) => {
  scn.expected = 'The edit is moderated: the violating text never reaches the receiver and the sender sees the blocked notice';
  await scn.rule({ action: ['blockMessage'], words: [scn.kw] });
  const { alice, bob } = await scn.oneToOne();
  const original = `draft note ${scn.tag}`;
  scn.message = `draft note ${scn.kw} ${scn.tag}`;
  const first = await alice.chat!.sendText(original);
  scn.check('Original clean message is delivered', await sees(bob.chat!, original, 20_000));
  await scn.shot('before', alice.page);
  const noticesBefore = await alice.chat!.blockedNoticeCount();
  const edit = await alice.chat!.editMessage(original, scn.message);
  scn.sendApi = { status: edit.status, body: edit.body };
  // The edit response is an "edited" action event; the block is recorded against the original message.
  scn.blockedEntry = await findBlocked(first, scn.message, 20_000);
  scn.check(`Edit is blocked by ${scn.ruleId}`, scn.blockedEntry?.ruleId === scn.ruleId, scn.blockedEntry ? `blocked by ${scn.blockedEntry.ruleId}` : 'no Blocked Messages entry for the original message');
  scn.senderNotice = await noticeShown(alice.chat!, noticesBefore);
  scn.check('Sender sees "blocked due to moderation" notice on the edited message', scn.senderNotice);
  const liveVisible = await sees(bob.chat!, scn.kw, 2_000);
  await reopen(bob, { user: alice.user.name });
  const afterReload = await sees(bob.chat!, scn.kw, 3_000);
  scn.delivered = liveVisible || afterReload;
  scn.check('Receiver never sees the edited violating text', !scn.delivered, `live: ${liveVisible ? 'visible' : 'hidden'}; after reload: ${afterReload ? 'visible' : 'hidden'}`);
  const originalStillThere = await sees(bob.chat!, original, 3_000);
  scn.api('Original message after edit', await admin.getMessage(first.messageId ?? ''));
  if (!originalStillThere) {
    scn.finding =
      'After the edit is blocked, the receiver loses the whole message — including the clean version they had already received. ' +
      'A sender can remove a delivered message from the other person\'s chat by editing it to break a rule.';
  }
  await scn.shot('after-sender', alice.page);
  await scn.shot('after-receiver', bob.page);
});

// ---- Rule history ----------------------------------------------------------------------

scenario('SCN-REV-HISTORY', 'Rule history', 'Rule revisions record each change', async (scn) => {
  scn.expected = 'Each enable/disable adds a revision to the rule history';
  await scn.rule({ action: ['blockMessage'], words: [scn.kw], enabled: false });
  const before = scn.api('Revisions before', await admin.ruleRevisions(scn.ruleId));
  const count = (r: admin.Raw<any[]>) => (Array.isArray(r.body.data) ? r.body.data.length : 0);
  scn.api('Enable rule', await setRuleEnabled(scn.ruleId, true));
  scn.api('Disable rule', await setRuleEnabled(scn.ruleId, false));
  const after = scn.api('Revisions after', await admin.ruleRevisions(scn.ruleId));
  scn.message = '(no message — rule configuration only)';
  scn.check('Revisions API responds', before.status === 200 && after.status === 200, `HTTP ${before.status} / ${after.status}`);
  scn.check('Two changes add two revisions', count(after) >= count(before) + 2, `${count(before)} → ${count(after)}`);
});

// ---------------------------------------------------------------------------

for (const s of SCENARIOS) {
  test(`${s.id}: ${s.title}`, async () => {
    const scn = new Scenario(s.id, s.area, s.title);
    const started = Date.now();
    let error: Error | undefined;
    try {
      await s.run(scn);
    } catch (e) {
      error = e as Error;
      await scn.captureError();
    } finally {
      await scn.cleanup();
    }
    const result = scn.result(started, error);
    recorder.add(result);
    test.info().annotations.push({ type: result.status, description: result.bug ?? result.finding ?? 'all checks passed' });
  });
}

test('summary: every scenario passed', () => {
  const failed = JSON.parse(fs.readFileSync(path.join(recorder.dir, 'results.json'), 'utf8')).results.filter((r: CaseResult) => r.status === 'FAIL');
  if (failed.length) throw new Error(failed.map((r: CaseResult) => `${r.id}: ${r.bug}`).join('\n'));
});
