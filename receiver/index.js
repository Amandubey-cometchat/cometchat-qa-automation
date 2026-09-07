require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const app = express();
app.use(express.json({ limit: '2mb' }));
// Serves trigger-categories.json (generated from src/registry/webhook.registry.ts
// — see scripts/generate-trigger-categories.ts) so the dashboard can group
// webhook events by category, plus any other future static assets.
app.use(express.static(path.join(__dirname, 'public')));

const USER = process.env.BASIC_AUTH_USER || 'qa';
const PASS = process.env.BASIC_AUTH_PASS || 'change-me';
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'events-history.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

// In-memory store used by tests (resetEvents() clears this between specs
// for isolation). Swap for Redis/Postgres for real CI use.
// Shape: [{ trigger, receivedAt, payload }]
let events = [];

// Separate append-only log, persisted to disk, that survives both receiver
// restarts and test resets — this is what the /dashboard inspector reads.
let history = [];
try {
  history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
} catch {
  history = [];
}

function saveHistory() {
  fs.writeFile(HISTORY_FILE, JSON.stringify(history), (err) => {
    if (err) console.error('Failed to persist event history:', err.message);
  });
}

function checkAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const expected = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
  if (header !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// CometChat posts every webhook event here.
app.post('/webhook', checkAuth, (req, res) => {
  const payload = req.body;
  const event = {
    id: crypto.randomUUID(),
    trigger: payload.trigger,
    receivedAt: Date.now(),
    method: req.method,
    headers: { 'content-type': req.headers['content-type'] || null },
    payload,
  };
  events.push(event);
  history.push(event);
  saveHistory();
  // Respond fast — CometChat expects 200 OK quickly.
  res.status(200).json({ ok: true, id: event.id });
});

// Tests poll this to check whether an event arrived.
// Query params: trigger, since (epoch ms)
app.get('/webhook/events', (req, res) => {
  const { trigger, since } = req.query;
  let results = events;
  if (trigger) results = results.filter((e) => e.trigger === trigger);
  if (since) results = results.filter((e) => e.receivedAt >= Number(since));
  res.json({ count: results.length, events: results });
});

// Reset between test runs. Only clears the test-facing store — /webhook/history
// (and the dashboard) is untouched, so it keeps a full record across test runs.
app.delete('/webhook/events', (_req, res) => {
  events = [];
  res.json({ ok: true });
});

// Full persisted history — survives receiver restarts and test resets.
// Same query params as /webhook/events. This is what /dashboard reads.
app.get('/webhook/history', (req, res) => {
  const { trigger, since } = req.query;
  let results = history;
  if (trigger) results = results.filter((e) => e.trigger === trigger);
  if (since) results = results.filter((e) => e.receivedAt >= Number(since));
  res.json({ count: results.length, events: results });
});

// Explicit, separate clear for the persisted history (dashboard's "Clear all").
app.delete('/webhook/history', (_req, res) => {
  history = [];
  saveHistory();
  res.json({ ok: true });
});

app.get('/health', (_req, res) => res.json({ ok: true, storedEvents: events.length, historyEvents: history.length }));

// Playwright's JSON reporter output, uploaded by scripts/upload-test-results.js
// right after each `npx playwright test` run (see package.json's
// test:webhooks script). Persisted to disk like event history — the raw
// report itself, not the flattened view GET /test-results computes from it.
//
// This receiver commonly runs somewhere other than the machine that ran the
// tests (e.g. deployed on Render while tests run from a developer's laptop),
// so it can't just read test-results/results.json off the local filesystem
// the way it could when both ran on localhost — the file simply isn't there.
const TEST_RESULTS_FILE = path.join(DATA_DIR, 'test-results.json');

let latestReport = null;
try {
  latestReport = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf-8'));
} catch {
  latestReport = null;
}

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return typeof str === 'string' ? str.replace(/\[[0-9;]*m/g, '') : str;
}

function flattenSpecs(suite, fileTitle, out) {
  for (const spec of suite.specs || []) {
    const test = spec.tests && spec.tests[0];
    const result = test && test.results && test.results[test.results.length - 1];
    if (!test || !result) continue;

    const skipAnnotation = (test.annotations || []).find((a) => a.type === 'skip');
    const failAnnotation = (test.annotations || []).find((a) => a.type === 'fail');
    const expectedFailure = test.expectedStatus === 'failed';

    let category;
    if (result.status === 'skipped') {
      // Registry-driven "documented gap" tests (webhook-configuration,
      // moderation/calls/meetings/campaign gap files) prefix their skip
      // reason with [BLOCKED] or [NOT_IMPLEMENTED] — a permanent, known
      // limitation (missing credentials/SDK integration), not an ordinary
      // ad hoc skip. Split into its own dashboard bucket so it doesn't
      // clutter the general "skipped" list with the same 8-30 rows every run.
      const reason = skipAnnotation ? skipAnnotation.description || '' : '';
      category = /^\[(BLOCKED|NOT_IMPLEMENTED)\]/.test(reason) ? 'blocked' : 'skipped';
    } else if (!spec.ok) category = 'failed'; // unexpected — spec.ok is false only for genuine regressions
    else if (expectedFailure && result.status === 'failed') category = 'expected-fail';
    else category = 'passed';

    const errorMessage = result.error ? stripAnsi(result.error.message) : null;
    // Not a certain diagnosis — there's no way to query the actual Dashboard
    // trigger-checkbox state without Management API credentials (still
    // blocked). This only distinguishes two failure *shapes* that otherwise
    // look identical: no webhook arrived at all (could be a disabled
    // trigger, could be a real regression) vs. one arrived but its content
    // was wrong (definitely a real bug). expectWebhookEvent's timeout error
    // always starts with this exact text — see src/webhook/webhook.waiter.ts.
    const likelyNotReceived = category === 'failed' && /^Error: Timed out waiting for webhook event/.test(errorMessage || '');

    out.push({
      file: fileTitle,
      title: spec.title,
      category,
      likelyNotReceived,
      status: result.status,
      duration: result.duration,
      error: errorMessage,
      skipReason: skipAnnotation ? skipAnnotation.description || null : null,
      knownIssueReason: failAnnotation ? failAnnotation.description || null : null,
    });
  }
  for (const child of suite.suites || []) {
    flattenSpecs(child, fileTitle, out);
  }
}

// Accepts the raw Playwright JSON report right after a test run — see
// scripts/upload-test-results.js. Same Basic Auth as webhook delivery.
app.post('/test-results', checkAuth, (req, res) => {
  latestReport = req.body;
  fs.writeFile(TEST_RESULTS_FILE, JSON.stringify(latestReport), (err) => {
    if (err) console.error('Failed to persist test results:', err.message);
  });
  res.status(200).json({ ok: true });
});

// Flattened Passed/Failed/Skipped breakdown of the most recent test run, for
// the dashboard's Test Results section — separate from the raw webhook
// payloads in /webhook/history: this answers "did the test pass", not just
// "did a webhook arrive".
app.get('/test-results', (_req, res) => {
  if (!latestReport) {
    return res.json({ available: false, tests: [], counts: {}, startTime: null, duration: null });
  }
  const report = latestReport;

  const tests = [];
  for (const suite of report.suites || []) {
    flattenSpecs(suite, suite.file || suite.title, tests);
  }

  const counts = { passed: 0, failed: 0, skipped: 0, 'expected-fail': 0 };
  for (const t of tests) counts[t.category] = (counts[t.category] || 0) + 1;

  res.json({
    available: true,
    tests,
    counts,
    startTime: report.stats ? report.stats.startTime : null,
    duration: report.stats ? report.stats.duration : null,
  });
});

// Clears the last uploaded test run's snapshot — the dashboard's "Clear
// all" button calls this alongside DELETE /webhook/history so both tabs
// reset together. No auth, same as the other dashboard-convenience clears
// below (DELETE /webhook/events, /webhook/history).
app.delete('/test-results', (_req, res) => {
  latestReport = null;
  fs.unlink(TEST_RESULTS_FILE, (err) => {
    if (err && err.code !== 'ENOENT') console.error('Failed to remove test results file:', err.message);
  });
  res.json({ ok: true });
});

// Visual inspector — browse every received webhook event, grouped by trigger.
app.get('/dashboard', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

app.listen(PORT, () => {
  console.log(`Webhook receiver listening on :${PORT}`);
  console.log(`  POST   /webhook          <- CometChat sends events here`);
  console.log(`  GET    /webhook/events   <- tests query received events`);
  console.log(`  DELETE /webhook/events   <- reset between runs`);
  console.log(`  GET    /webhook/history  <- full persisted event log`);
  console.log(`  DELETE /webhook/history  <- clear persisted history`);
  console.log(`  POST   /test-results     <- uploaded after each test run (see scripts/upload-test-results.js)`);
  console.log(`  GET    /test-results     <- Playwright pass/fail/skip breakdown`);
  console.log(`  DELETE /test-results     <- clear the last uploaded test run's snapshot`);
  console.log(`  GET    /dashboard        <- visual event inspector (reads history)`);
});
