/**
 * Toggle matrix: for every moderation rule, switch it ON → send content it
 * should block → verify; switch it OFF → send the same content → verify it
 * goes through. Every case is executed through the sample app's UI and keeps
 * its evidence (screenshots, the SDK's real send response, the Blocked
 * Messages entry) in reports/toggle-run/<runId>/ for the dashboard.
 *
 * Isolation: all rules are switched OFF first, so each case has exactly one
 * rule active and a block can't be caused by a different rule. The app's
 * original rule states are restored afterwards (scripts/restore-rules.ts
 * can also restore them from the saved backup if a run is killed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { getConfig } from '../../config/env';
import { createUser, deleteUser, listBlockedMessages, listRules, TestUser } from '../../api/cometchat.api';
import { getRule, setRuleEnabled } from '../../api/rules.api';
import { LoginPage } from '../../pages/login.page';
import { ChatPage, SendResult } from '../../pages/chat.page';
import { TOGGLE_CASES, ToggleCase } from '../../toggles/toggle-cases';
import { CaseResult, EvidenceRecorder } from '../../toggles/evidence';

test.describe.configure({ mode: 'serial', timeout: 240_000 });

const ROOT = path.resolve(__dirname, '../../..');
/** Time for a rule change to take effect before sending. */
const PROPAGATION_MS = 8_000;
/** How long to wait for a message to reach the receiver. */
const DELIVERY_TIMEOUT_MS = 20_000;
/** How long to watch for a Blocked Messages entry. */
const BLOCKED_LOOKUP_MS = 30_000;

let recorder: EvidenceRecorder;
let originalRules: Map<string, boolean>;
let ruleNames: Map<string, string>;
type Actor = { user: TestUser; context: BrowserContext; chat: ChatPage };
let alice: Actor | undefined;
let bob: Actor | undefined;
let actorsFor = '';
let browserRef: Browser;
const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const short = Date.now().toString(36);

test.beforeAll(async ({ browser }) => {
  const cfg = getConfig();
  recorder = new EvidenceRecorder(path.join(ROOT, 'reports/toggle-run'), {
    runId,
    appEnv: cfg.appEnv,
    appId: cfg.appId,
    startedAt: new Date().toISOString(),
    sampleAppCommit: fs.readFileSync(path.join(ROOT, 'sample-app/.pinned-commit'), 'utf8').trim(),
    isolation: 'All rules switched OFF before the run; exactly one rule ON per ON-case.',
    notes: [
      'Rule toggles are switched through the Moderation REST API (PUT /moderation/rules/{id}) — the same setting as the Dashboard toggle; Dashboard screenshots are not taken because Claude Code cannot use a Dashboard login session.',
      `Each toggle change waits ${PROPAGATION_MS / 1000}s before sending.`,
    ],
  });

  const rules = await listRules();
  fs.writeFileSync(path.join(recorder.dir, 'rules-before.json'), JSON.stringify(rules, null, 2));
  originalRules = new Map(rules.map((r) => [r.id, r.enabled]));
  ruleNames = new Map(rules.map((r) => [r.id, r.name]));

  for (const r of rules) if (r.enabled) await setRuleEnabled(r.id, false);

  browserRef = browser;
});

/**
 * A fresh alice/bob pair (and so a fresh conversation) for each toggle: the AI
 * rules judge a message together with recent conversation history, so reusing
 * one chat would let one toggle's test content influence the next toggle.
 */
async function ensureActors(code: string): Promise<{ alice: Actor; bob: Actor }> {
  if (actorsFor !== code || !alice || !bob) {
    await disposeActors();
    const make = async (role: string) => {
      const user = { uid: `modtoggle-${short}-${code.toLowerCase()}-${role}`, name: `Toggle ${code} ${role} ${short}` };
      await createUser(user);
      const context = await browserRef.newContext({ viewport: { width: 1400, height: 850 } });
      const home = await new LoginPage(await context.newPage()).loginAs(user.uid);
      return { user, context, home };
    };
    const a = await make('alice');
    const b = await make('bob');
    alice = { user: a.user, context: a.context, chat: await a.home.openUserChat(b.user.name) };
    bob = { user: b.user, context: b.context, chat: await b.home.openUserChat(a.user.name) };
    actorsFor = code;
  }
  return { alice: alice!, bob: bob! };
}

async function disposeActors(): Promise<void> {
  for (const actor of [alice, bob]) {
    if (!actor) continue;
    await actor.context.close().catch(() => undefined);
    await deleteUser(actor.user.uid).catch(() => undefined);
  }
  alice = bob = undefined;
}

test.afterAll(async () => {
  // Put every rule back exactly as it was before the run.
  let restored = true;
  for (const [id, enabled] of originalRules ?? []) {
    try {
      if ((await getRule(id)).enabled !== enabled) await setRuleEnabled(id, enabled);
    } catch {
      restored = false;
    }
  }
  if (recorder) {
    fs.writeFileSync(path.join(recorder.dir, 'rules-after.json'), JSON.stringify(await listRules(), null, 2));
    recorder.info.rulesRestored = restored;
    recorder.info.finishedAt = new Date().toISOString();
    recorder.flush();
  }
  await disposeActors();
});

async function findBlocked(send: SendResult, text: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = (await listBlockedMessages()).find((b) =>
      send.messageId ? String(b.message.id) === String(send.messageId) : b.message.data?.text === text
    );
    if (hit) return { ruleId: hit.ruleId, ruleName: hit.ruleName, action: hit.action };
    await new Promise((r) => setTimeout(r, 2_000));
  }
  return null;
}

async function runCase(tc: ToggleCase, state: 'ON' | 'OFF'): Promise<CaseResult> {
  const id = `MOD-${tc.code}-${state}`;
  const started = Date.now();
  const tag = `[${id} ${short}]`;
  const isImage = tc.kind === 'image';
  const isVideo = tc.kind === 'video';
  const isMedia = isImage || isVideo;
  const message = tc.message(tag);
  const base: CaseResult = {
    id,
    ruleId: tc.ruleId,
    ruleName: ruleNames.get(tc.ruleId) ?? tc.ruleId,
    state,
    kind: tc.kind,
    message: isMedia ? `${tc.kind}: ${path.basename(message)}` : message,
    expected:
      state === 'ON'
        ? `Blocked by ${tc.ruleId}; listed in Blocked Messages; sender sees "blocked due to moderation" notice; never shown to the receiver`
        : 'Delivered to the receiver; not in Blocked Messages',
    actual: '',
    screenshots: {},
    status: 'FAIL',
    startedAt: new Date(started).toISOString(),
    durationMs: 0,
  };

  if (tc.notRunReason) {
    return { ...base, status: 'NOT RUN', actual: tc.notRunReason, durationMs: 0 };
  }

  const { alice, bob } = await ensureActors(tc.code);
  const alicePage = alice.chat.messageList.page();
  const bobPage = bob.chat.messageList.page();

  // Steps 1–3 / 8–9: switch the toggle and confirm its state.
  const toggleRes = await setRuleEnabled(tc.ruleId, state === 'ON');
  const enabledAfter = (await getRule(tc.ruleId)).enabled;
  base.toggle = { status: toggleRes.status, enabledAfter };
  await alicePage.waitForTimeout(PROPAGATION_MS);

  const before = recorder.shot(id, 'before');
  await alicePage.screenshot({ path: before.abs });
  base.screenshots.before = before.rel;

  // Steps 4 / 10: send through the UI, keeping the SDK's real API response.
  const mediaCount = () => bob.chat.mediaBubbleCount();
  const bobMediaBefore = isMedia ? await mediaCount() : 0;
  const noticesBefore = await alice.chat.blockedNoticeCount();
  const send = isVideo
    ? await alice.chat.sendVideo(path.join(ROOT, message))
    : isImage
      ? await alice.chat.sendImage(path.join(ROOT, message))
      : await alice.chat.sendText(message);
  base.sendApi = { status: send.status, body: send.body };

  // Moderation verdict as recorded by CometChat.
  base.blockedEntry = await findBlocked(send, message, state === 'ON' ? BLOCKED_LOOKUP_MS : 10_000);

  // Did it reach the receiver? For ON cases a clean follow-up must arrive,
  // proving the receiver's chat is live before we conclude "not delivered".
  let receiverLive = true;
  let followUpBlockedBy: string | undefined;
  if (state === 'ON') {
    const followUp = `follow-up check ${tag}`;
    const followUpSend = await alice.chat.sendText(followUp);
    receiverLive = await bob.chat
      .bubble(followUp)
      .waitFor({ timeout: DELIVERY_TIMEOUT_MS })
      .then(() => true, () => false);
    if (!receiverLive) {
      // Was the harmless follow-up itself blocked? (AI rules use conversation context.)
      followUpBlockedBy = (await findBlocked(followUpSend, followUp, 10_000))?.ruleId;
      if (followUpBlockedBy) {
        base.finding =
          `The harmless follow-up "${followUp}" was ALSO blocked by ${followUpBlockedBy} — the rule appears to judge ` +
          'it in the context of the previous blocked message (possible false positive).';
      }
    }
  }
  const delivered = isMedia
    ? await expect
        .poll(mediaCount, { timeout: state === 'ON' ? 5_000 : DELIVERY_TIMEOUT_MS })
        .toBeGreaterThan(bobMediaBefore)
        .then(() => true, () => false)
    : await bob.chat
        .bubble(message)
        .waitFor({ timeout: state === 'ON' ? 5_000 : DELIVERY_TIMEOUT_MS })
        .then(() => true, () => false);
  base.deliveredToReceiver = delivered;

  // What the sender sees (steps 5 / 11).
  if (!isMedia) {
    const own = alice.chat.bubble(message);
    base.senderView = (await own.isVisible())
      ? `Shown in sender's chat: "${(await own.innerText()).replace(/\s+/g, ' ').slice(0, 160)}"`
      : "Not shown in sender's chat";
  } else {
    base.senderView = `${tc.kind === 'video' ? 'Video' : 'Image'} sent from sender's composer`;
  }

  base.senderBlockedNotice = await expect
    .poll(() => alice.chat.blockedNoticeCount(), { timeout: state === 'ON' ? 10_000 : 2_000 })
    .toBeGreaterThan(noticesBefore)
    .then(() => true, () => false);

  const afterSender = recorder.shot(id, 'after-sender');
  const afterReceiver = recorder.shot(id, 'after-receiver');
  await alicePage.screenshot({ path: afterSender.abs });
  await bobPage.screenshot({ path: afterReceiver.abs });
  base.screenshots.afterSender = afterSender.rel;
  base.screenshots.afterReceiver = afterReceiver.rel;

  // Verdict.
  const problems: string[] = [];
  if (enabledAfter !== (state === 'ON')) problems.push(`toggle did not switch ${state}`);
  if (state === 'ON') {
    if (!base.blockedEntry) problems.push('no Blocked Messages entry');
    else if (base.blockedEntry.ruleId !== tc.ruleId) problems.push(`blocked by ${base.blockedEntry.ruleId}, not ${tc.ruleId}`);
    if (delivered) problems.push('message reached the receiver');
    if (!base.senderBlockedNotice) problems.push('sender was not shown the "blocked due to moderation" notice');
    if (!receiverLive && !followUpBlockedBy) problems.push("receiver's chat not live (clean follow-up never arrived and was not blocked) — delivery check inconclusive");
  } else {
    if (!delivered) problems.push('message did not reach the receiver');
    if (base.blockedEntry) problems.push(`still blocked by ${base.blockedEntry.ruleId} with the toggle OFF`);
    if (base.senderBlockedNotice) problems.push('sender was shown a "blocked" notice with the toggle OFF');
  }

  base.actual =
    (base.blockedEntry ? `Blocked by ${base.blockedEntry.ruleId}` : 'Not blocked') +
    `; ${delivered ? 'delivered to' : 'not delivered to'} receiver` +
    `; sender ${base.senderBlockedNotice ? 'saw' : 'did not see'} the "blocked" notice; send API HTTP ${send.status}`;
  base.status = problems.length ? 'FAIL' : 'PASS';
  if (problems.length) base.bug = problems.join('; ');
  base.durationMs = Date.now() - started;
  return base;
}

for (const tc of TOGGLE_CASES) {
  for (const state of ['ON', 'OFF'] as const) {
    // Cases record PASS/FAIL in the report rather than failing the Playwright
    // test, so one failure never stops the remaining toggles from running.
    test(`MOD-${tc.code}-${state}: ${tc.ruleId} ${state}`, async () => {
      let result: CaseResult;
      try {
        result = await runCase(tc, state);
      } catch (e) {
        result = {
          id: `MOD-${tc.code}-${state}`, ruleId: tc.ruleId, ruleName: ruleNames.get(tc.ruleId) ?? tc.ruleId, state, kind: tc.kind,
          message: tc.kind === 'text' ? tc.message(`[MOD-${tc.code}-${state} ${short}]`) : tc.kind,
          expected: state === 'ON' ? `Blocked by ${tc.ruleId}` : 'Delivered to the receiver',
          actual: 'Test execution error', screenshots: {}, status: 'FAIL',
          bug: `Execution error: ${(e as Error).message.split('\n')[0]}`, startedAt: new Date().toISOString(), durationMs: 0,
        };
      }
      recorder.add(result);
      test.info().annotations.push({ type: result.status, description: result.bug ?? result.finding ?? result.actual });
      test.skip(result.status === 'NOT RUN', result.actual);
    });
  }
}

test('summary: every executed toggle case passed', () => {
  const failed = JSON.parse(fs.readFileSync(path.join(recorder.dir, 'results.json'), 'utf8')).results.filter(
    (r: CaseResult) => r.status === 'FAIL'
  );
  expect(failed.map((r: CaseResult) => `${r.id}: ${r.bug}`)).toEqual([]);
});
