/**
 * Streams each test's result to the receiver the moment it finishes, so the
 * dashboard's Test results tab fills in live during a run.
 *
 * Why this exists: the pipeline clears Test results before a run and
 * scripts/upload-test-results.ts only posts reports/json/results.json after
 * the WHOLE run ends — so for a full run (8+ minutes) the tab sat at zero
 * and then everything appeared at once. That upload still runs afterwards
 * as the authoritative final snapshot; this reporter just fills the gap.
 *
 * Opt-in via LIVE_RESULTS=1, which every full-run entry point sets (the npm
 * test:* scripts, cli/lib/pipeline.ts, scripts/test-legacy.ts). A bare
 * `npx playwright test some.spec.ts` diagnostic run deliberately does NOT
 * stream: onBegin replaces the dashboard's results, and a quick one-file
 * check shouldn't wipe a full run someone is still looking at — the same
 * reason scripts/clear-history.ts isn't a globalSetup hook.
 *
 * LIVE_RESULTS_URL optionally overrides the receiver base URL (e.g. a local
 * receiver while developing the dashboard); it defaults to this
 * environment's RECEIVER_QUERY_URL.
 *
 * Never allowed to affect the run itself: every POST is best-effort with a
 * timeout, failures are reported once rather than per test, and onEnd's
 * final flush is capped so an unreachable receiver can't hold up exit.
 */
import path from 'path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { getConfig } from '../config/env';

const POST_TIMEOUT_MS = 8000;
const FINAL_FLUSH_CAP_MS = 15000;

type LiveEvent = Record<string, unknown> & { type: 'begin' | 'testBegin' | 'testEnd' | 'end' };

export default class LiveResultsReporter implements Reporter {
  private readonly enabled = process.env.LIVE_RESULTS === '1';
  private readonly runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  private endpoint = '';
  private authHeader = '';
  private chain: Promise<void> = Promise.resolve();
  private warned = false;

  printsToStdio(): boolean {
    return false;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    if (!this.enabled) return;
    const { appEnv, receiverQueryUrl, webhookBasicAuthUser, webhookBasicAuthPass } = getConfig();
    this.endpoint = `${(process.env.LIVE_RESULTS_URL || receiverQueryUrl).replace(/\/$/, '')}/test-results/live`;
    this.authHeader = 'Basic ' + Buffer.from(`${webhookBasicAuthUser}:${webhookBasicAuthPass}`).toString('base64');
    this.send({ type: 'begin', startTime: new Date().toISOString(), planned: suite.allTests().length, env: appEnv });
  }

  onTestBegin(test: TestCase): void {
    if (!this.enabled) return;
    this.send({ type: 'testBegin', file: this.fileOf(test), title: test.title });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.enabled) return;
    // result.annotations carries runtime test.skip()/test.fail() reasons for
    // this attempt; the receiver reads them to tell a documented gap or a
    // known CometChat bug apart from an ordinary skip or failure.
    const annotations = (result.annotations.length ? result.annotations : test.annotations).map((a) => ({
      type: a.type,
      description: a.description,
    }));
    this.send({
      type: 'testEnd',
      file: this.fileOf(test),
      title: test.title,
      ok: test.outcome() !== 'unexpected',
      expectedStatus: test.expectedStatus,
      annotations,
      status: result.status,
      duration: result.duration,
      startTime: result.startTime.toISOString(),
      error: result.error ? { message: result.error.message ?? String(result.error.value ?? '') } : null,
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    if (!this.enabled) return;
    this.send({ type: 'end', status: result.status, duration: Math.round(result.duration) });
    await Promise.race([this.chain, new Promise((resolve) => setTimeout(resolve, FINAL_FLUSH_CAP_MS))]);
  }

  /** Same form Playwright's JSON reporter uses (relative to testDir, forward slashes), so the dashboard groups identically either way. */
  private fileOf(test: TestCase): string {
    const testDir = test.parent.project()?.testDir;
    const rel = testDir ? path.relative(testDir, test.location.file) : path.basename(test.location.file);
    return rel.split(path.sep).join('/');
  }

  /** Serialized so the receiver always sees begin -> tests -> end in order. */
  private send(event: LiveEvent): void {
    const body = JSON.stringify({ ...event, runId: this.runId });
    this.chain = this.chain.then(async () => {
      try {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: this.authHeader },
          body,
          signal: AbortSignal.timeout(POST_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        if (!this.warned) {
          this.warned = true;
          process.stderr.write(
            `\n[live results] Could not stream to ${this.endpoint} (${(err as Error).message}). ` +
              `Tests are unaffected; results still upload when the run finishes.\n`
          );
        }
      }
    });
  }
}
