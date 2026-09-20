/**
 * Builds dashboard.html for a toggle run or a scenario run from its results.json. Screenshots
 * are referenced relatively (screenshots/…), so publish/open the page from
 * the run folder alongside them.
 *
 * Usage: npx tsx scripts/build-dashboard.ts reports/(toggle|scenario)-run/<runId>
 */
import fs from 'node:fs';
import path from 'node:path';
import type { CaseResult, RunInfo } from '../src/toggles/evidence';

const dir = process.argv[2];
if (!dir) throw new Error('Pass the run folder, e.g. reports/toggle-run/<runId>');
const { info, results } = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8')) as {
  info: RunInfo;
  results: CaseResult[];
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const json = (v: unknown) => esc(JSON.stringify(v, null, 2));
const pill = (status: string) => `<span class="pill pill--${status.replace(' ', '-').toLowerCase()}">${esc(status)}</span>`;
const yesNo = (v: boolean | undefined, yes: string, no: string) => (v === undefined ? '—' : v ? yes : no);

const executed = results.filter((r) => r.status !== 'NOT RUN');
const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
const notRun = results.filter((r) => r.status === 'NOT RUN').length;
const blockedCount = executed.filter((r) => r.blockedEntry).length;
const deliveredCount = executed.filter((r) => r.deliveredToReceiver).length;

const sendStatuses = new Map<number, number>();
const toggleStatuses = new Map<number, number>();
for (const r of executed) {
  if (r.sendApi) sendStatuses.set(r.sendApi.status, (sendStatuses.get(r.sendApi.status) ?? 0) + 1);
  if (r.toggle) toggleStatuses.set(r.toggle.status, (toggleStatuses.get(r.toggle.status) ?? 0) + 1);
}
const statusList = (m: Map<number, number>) =>
  [...m].map(([s, n]) => `<span class="code code--${s < 300 ? 'ok' : 'bad'}">HTTP ${s} × ${n}</span>`).join(' ') || '—';

// Toggle-wise grid: one row per rule, ON and OFF side by side.
const byRule = new Map<string, { name: string; kind: string; on?: CaseResult; off?: CaseResult }>();
for (const r of results) {
  const row = byRule.get(r.ruleId) ?? { name: r.ruleName, kind: r.kind };
  if (r.state === 'ON') row.on = r;
  else row.off = r;
  byRule.set(r.ruleId, row);
}
const cell = (r?: CaseResult) => {
  if (!r) return '<td>—</td>';
  const facts =
    r.status === 'NOT RUN'
      ? ''
      : `<span class="facts">${esc(r.blockedEntry ? 'blocked' : 'not blocked')} · ${esc(r.deliveredToReceiver ? 'delivered' : 'not delivered')}</span>`;
  return `<td><a class="cell-link" href="#${esc(r.id)}">${pill(r.status)}</a>${facts}</td>`;
};
const gridRows = [...byRule]
  .map(
    ([id, row]) => `<tr>
      <th scope="row"><span class="rule-name">${esc(row.name)}</span><code>${esc(id)}</code></th>
      <td class="kind">${esc(row.kind)}</td>${cell(row.on)}${cell(row.off)}</tr>`
  )
  .join('');

const failures = results.filter((r) => r.status === 'FAIL');
const failureHtml = failures.length
  ? failures
      .map(
        (r) => `<li class="bug">
        <div class="bug-head"><a href="#${esc(r.id)}"><code>${esc(r.id)}</code></a> ${esc(r.ruleName)} — toggle ${esc(r.state)}</div>
        <p><strong>What went wrong:</strong> ${esc(r.bug)}</p>
        <p><strong>Expected:</strong> ${esc(r.expected)}<br /><strong>Actual:</strong> ${esc(r.actual)}</p>
        <p class="repro"><strong>Reproduce:</strong> In app <code>${esc(info.appEnv)}</code>, switch every moderation rule off, then switch
        <code>${esc(r.ruleId)}</code> ${esc(r.state)}. Wait ~10s, send <q>${esc(r.message)}</q> from one user to another in the React sample app,
        and check Moderation → Blocked Messages and the receiver's chat.</p>
      </li>`
      )
      .join('')
  : '<li class="bug bug--none">No failed test cases in this run.</li>';

const findings = results.filter((r) => r.finding);
const findingHtml = findings.length
  ? findings
      .map(
        (r) => `<li class="bug bug--finding">
        <div class="bug-head"><a href="#${esc(r.id)}"><code>${esc(r.id)}</code></a> ${esc(r.ruleName)} — toggle ${esc(r.state)}</div>
        <p>${esc(r.finding)}</p>
        <p class="repro"><strong>Reproduce:</strong> In app <code>${esc(info.appEnv)}</code>, with only <code>${esc(r.ruleId)}</code> ON, send
        <q>${esc(r.message)}</q>, then a harmless message in the same conversation. Check Moderation → Blocked Messages.</p>
      </li>`
      )
      .join('')
  : '';

const shot = (rel: string | undefined, label: string, caseId: string) =>
  rel
    ? `<figure><button type="button" class="shot" data-src="${esc(rel)}" data-caption="${esc(caseId)} · ${esc(label)}">
         <img src="${esc(rel)}" alt="${esc(caseId)} — ${esc(label)}" loading="lazy" /></button><figcaption>${esc(label)}</figcaption></figure>`
    : '';

const caseCards = results
  .map(
    (r) => `<article class="case case--${r.status.replace(' ', '-').toLowerCase()}" id="${esc(r.id)}">
    <header class="case-head">
      <div><code class="case-id">${esc(r.id)}</code><h3>${esc(r.ruleName)} <span class="state state--${r.state.toLowerCase()}">${esc(r.state)}</span></h3></div>
      ${pill(r.status)}
    </header>
    <dl class="fields">
      <div><dt>Test message</dt><dd>${esc(r.message)}</dd></div>
      <div><dt>Expected</dt><dd>${esc(r.expected)}</dd></div>
      <div><dt>Actual</dt><dd>${esc(r.actual)}</dd></div>
      ${r.status === 'NOT RUN' ? '' : `
      <div><dt>Toggle</dt><dd>PUT HTTP ${esc(r.toggle?.status)} · read back as <strong>${esc(r.toggle?.enabledAfter ? 'ON' : 'OFF')}</strong></dd></div>
      <div><dt>Send API</dt><dd><span class="code code--${(r.sendApi?.status ?? 0) < 300 ? 'ok' : 'bad'}">HTTP ${esc(r.sendApi?.status)}</span></dd></div>
      <div><dt>Blocked Messages</dt><dd>${r.blockedEntry ? `${esc(r.blockedEntry.ruleName)} (<code>${esc(r.blockedEntry.ruleId)}</code>) · ${esc(r.blockedEntry.action.join(', '))}` : 'No entry'}</dd></div>
      <div><dt>Receiver</dt><dd>${yesNo(r.deliveredToReceiver, 'Received the message', 'Did not receive it')}</dd></div>
      <div><dt>Sender's screen</dt><dd>${yesNo(r.senderBlockedNotice, 'Showed "Your message was blocked due to moderation policies"', 'No blocked notice')}</dd></div>`}
      ${r.bug ? `<div class="bug-field"><dt>Bug details</dt><dd>${esc(r.bug)}</dd></div>` : ''}
      ${r.finding ? `<div class="finding-field"><dt>Finding</dt><dd>${esc(r.finding)}</dd></div>` : ''}
    </dl>
    ${r.status === 'NOT RUN' ? '' : `
    <div class="shots">
      ${shot(r.screenshots.before, 'Before sending (sender)', r.id)}
      ${shot(r.screenshots.afterSender, 'After sending — sender', r.id)}
      ${shot(r.screenshots.afterReceiver, 'After sending — receiver', r.id)}
    </div>
    <details><summary>Send API response body</summary><pre>${json(r.sendApi?.body)}</pre></details>`}
  </article>`
  )
  .join('');

const passRate = executed.length ? Math.round((passed / executed.length) * 100) : 0;

// ---- Scenario runs: grouped by feature area, with per-check results --------------
const scenarioMode = results.some((r) => r.area);
const SHOT_LABELS: Record<string, string> = {
  before: 'Before',
  afterSender: 'After — sender',
  afterReceiver: 'After — receiver',
  'after-sender': 'After — sender',
  'after-receiver': 'After — receiver',
};
const shotLabel = (k: string) => SHOT_LABELS[k] ?? k.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const checksOf = (r: CaseResult) => r.checks ?? [];

const scenarioRows = results
  .map(
    (r) => `<tr>
      <td class="kind">${esc(r.area)}</td>
      <th scope="row"><span class="rule-name">${esc(r.title)}</span><code>${esc(r.id)}</code></th>
      <td><a class="cell-link" href="#${esc(r.id)}">${pill(r.status)}</a>${r.finding ? '<span class="facts facts--warn">finding</span>' : ''}</td>
      <td class="kind">${checksOf(r).filter((c) => c.pass).length} / ${checksOf(r).length} checks</td></tr>`
  )
  .join('');

const scenarioFailureHtml = failures.length
  ? failures
      .map(
        (r) => `<li class="bug">
        <div class="bug-head"><a href="#${esc(r.id)}"><code>${esc(r.id)}</code></a> ${esc(r.title)}</div>
        <p><strong>Failed checks:</strong> ${esc(r.bug)}</p>
        <p><strong>Expected:</strong> ${esc(r.expected)}</p>
        <p class="repro"><strong>Reproduce:</strong> in app <code>${esc(info.appEnv)}</code>, follow the steps in this case's API calls and screenshots below${r.message ? ` with the message <q>${esc(r.message)}</q>` : ''}.</p>
      </li>`
      )
      .join('')
  : '<li class="bug bug--none">No failed scenarios in this run.</li>';

const scenarioFindingHtml = findings
  .map(
    (r) => `<li class="bug bug--finding">
      <div class="bug-head"><a href="#${esc(r.id)}"><code>${esc(r.id)}</code></a> ${esc(r.title)}</div>
      <p>${esc(r.finding)}</p></li>`
  )
  .join('');

const scenarioCards = results
  .map(
    (r) => `<article class="case case--${r.status.replace(' ', '-').toLowerCase()}" id="${esc(r.id)}">
    <header class="case-head">
      <div><code class="case-id">${esc(r.id)} · ${esc(r.area)}</code><h3>${esc(r.title)}</h3></div>
      ${pill(r.status)}
    </header>
    <dl class="fields">
      <div><dt>Test message</dt><dd>${esc(r.message || '—')}</dd></div>
      <div><dt>Expected</dt><dd>${esc(r.expected)}</dd></div>
      ${r.sendApi ? `<div><dt>Send / edit API</dt><dd><span class="code code--${r.sendApi.status < 300 ? 'ok' : 'bad'}">HTTP ${esc(r.sendApi.status)}</span></dd></div>` : ''}
      ${r.blockedEntry ? `<div><dt>Blocked Messages</dt><dd>${esc(r.blockedEntry.ruleName)} (<code>${esc(r.blockedEntry.ruleId)}</code>) · ${esc(r.blockedEntry.action.join(', '))}</dd></div>` : ''}
      ${r.bug ? `<div class="bug-field"><dt>Bug details</dt><dd>${esc(r.bug)}</dd></div>` : ''}
      ${r.finding ? `<div class="finding-field"><dt>Finding</dt><dd>${esc(r.finding)}</dd></div>` : ''}
    </dl>
    <ul class="checks">${checksOf(r)
      .map((c) => `<li class="check check--${c.pass ? 'pass' : 'fail'}"><span aria-hidden="true">${c.pass ? '✓' : '✗'}</span><span>${esc(c.label)}${c.detail ? ` <em>${esc(c.detail)}</em>` : ''}</span></li>`)
      .join('')}</ul>
    ${Object.keys(r.screenshots).length ? `<div class="shots">${Object.entries(r.screenshots).map(([k, v]) => shot(v, shotLabel(k), r.id)).join('')}</div>` : ''}
    <div class="api-list">
      ${(r.apis ?? []).map((a) => `<details><summary>${esc(a.label)} — HTTP ${esc(a.status)}</summary><pre>${json(a.body)}</pre></details>`).join('')}
      ${r.sendApi ? `<details><summary>Send / edit API response body</summary><pre>${json(r.sendApi.body)}</pre></details>` : ''}
    </div>
  </article>`
  )
  .join('');

const html = `<title>${scenarioMode ? 'Moderation Scenario Board' : 'Moderation Toggle Board'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" />
<style>
:root {
  --ground: #f4f6f3; --surface: #ffffff; --sunk: #eaeee9; --line: #d6ddd6;
  --ink: #18201b; --muted: #5a655d; --accent: #0d6b5e;
  --pass: #1e8449; --pass-bg: #e3f3e8; --fail: #c0392b; --fail-bg: #fbe7e4;
  --skip: #6b736d; --skip-bg: #eceeec; --warn: #b45f06; --warn-bg: #fbeedd;
  --shadow: 0 1px 2px rgb(24 32 27 / 0.06), 0 4px 16px rgb(24 32 27 / 0.05);
  --sans: 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --cond: 'IBM Plex Sans Condensed', 'Arial Narrow', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #101513; --surface: #171e1b; --sunk: #1d2521; --line: #2b3530;
    --ink: #e4ebe6; --muted: #9aa69e; --accent: #4fc3ae;
    --pass: #5fd08a; --pass-bg: #173524; --fail: #ff7b6b; --fail-bg: #3d1d19;
    --skip: #a3aca6; --skip-bg: #262d29; --warn: #f0a34a; --warn-bg: #3a2a15;
    --shadow: none; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --ground: #101513; --surface: #171e1b; --sunk: #1d2521; --line: #2b3530;
  --ink: #e4ebe6; --muted: #9aa69e; --accent: #4fc3ae;
  --pass: #5fd08a; --pass-bg: #173524; --fail: #ff7b6b; --fail-bg: #3d1d19;
  --skip: #a3aca6; --skip-bg: #262d29; --warn: #f0a34a; --warn-bg: #3a2a15;
  --shadow: none; color-scheme: dark;
}
* { box-sizing: border-box; }
body { background: var(--ground); color: var(--ink); font: 15px/1.55 var(--sans); padding-inline: 20px; padding-block: 28px 64px; }
.wrap { max-width: 1180px; margin: 0 auto; display: grid; gap: 36px; }
h1, h2, h3 { font-family: var(--cond); text-wrap: balance; margin: 0; }
h1 { font-size: clamp(28px, 4vw, 38px); font-weight: 700; letter-spacing: -0.01em; }
h2 { font-size: 20px; font-weight: 600; display: flex; align-items: baseline; gap: 10px; }
h2 small { font: 500 12px var(--sans); color: var(--muted); letter-spacing: 0.04em; text-transform: uppercase; }
code, pre { font-family: var(--mono); font-size: 12.5px; }
a { color: var(--accent); }
a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.masthead { display: grid; gap: 14px; }
.eyebrow { font: 600 12px var(--sans); letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
.meta { display: flex; flex-wrap: wrap; gap: 8px 22px; color: var(--muted); font-size: 13.5px; }
.meta b { color: var(--ink); font-weight: 600; }
.note { background: var(--sunk); border-radius: 8px; padding: 12px 14px; color: var(--muted); font-size: 13.5px; max-width: 80ch; }
.note p { margin: 0; } .note p + p { margin-top: 6px; }

.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.tile { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: grid; gap: 2px; box-shadow: var(--shadow); }
.tile .num { font: 700 34px/1.1 var(--cond); font-variant-numeric: tabular-nums; }
.tile .lbl { font-size: 12.5px; color: var(--muted); }
.tile--pass .num { color: var(--pass); } .tile--fail .num { color: var(--fail); } .tile--skip .num { color: var(--skip); } .tile--warn .num { color: var(--warn); }
.bar { height: 8px; border-radius: 4px; background: var(--sunk); overflow: hidden; display: flex; }
.bar span { display: block; height: 100%; }
.api { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: center; font-size: 13.5px; color: var(--muted); }

.pill { display: inline-block; font: 600 11.5px/1 var(--sans); letter-spacing: 0.05em; padding: 5px 9px; border-radius: 999px; white-space: nowrap; }
.pill--pass { background: var(--pass-bg); color: var(--pass); }
.pill--fail { background: var(--fail-bg); color: var(--fail); }
.pill--not-run { background: var(--skip-bg); color: var(--skip); }
.code { font: 500 12px var(--mono); padding: 2px 7px; border-radius: 5px; }
.code--ok { background: var(--pass-bg); color: var(--pass); } .code--bad { background: var(--fail-bg); color: var(--fail); }
.state { font: 600 11px var(--sans); padding: 3px 7px; border-radius: 4px; vertical-align: middle; letter-spacing: 0.05em; }
.state--on { background: var(--warn-bg); color: var(--warn); } .state--off { background: var(--sunk); color: var(--muted); }

.table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }
table { border-collapse: collapse; width: 100%; min-width: 620px; }
th, td { text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
thead th { font: 600 12px var(--sans); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); background: var(--sunk); }
tbody tr:last-child > * { border-bottom: 0; }
th[scope="row"] { font-weight: 500; }
th[scope="row"] .rule-name { display: block; margin-bottom: 2px; }
th[scope="row"] code { color: var(--muted); font-size: 11.5px; }
td.kind { color: var(--muted); font-size: 13px; }
.cell-link { text-decoration: none; }
.facts { display: block; font-size: 12px; color: var(--muted); margin-top: 5px; }

.bugs { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.bug { background: var(--fail-bg); border-radius: 10px; padding: 14px 16px; }
.bug p { margin: 6px 0 0; max-width: 90ch; }
.bug-head { font-weight: 600; }
.bug--none { background: var(--pass-bg); color: var(--pass); font-weight: 600; }
.bug--finding { background: var(--warn-bg); }
.facts--warn { color: var(--warn); font-weight: 600; }
.checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.check { display: flex; gap: 8px; align-items: baseline; font-size: 14px; }
.check > span:first-child { font-weight: 700; width: 1em; flex: none; }
.check--pass > span:first-child { color: var(--pass); }
.check--fail { color: var(--fail); font-weight: 500; }
.check em { color: var(--muted); font-style: normal; font-size: 12.5px; }
.api-list { display: grid; gap: 6px; }
.finding-field dd { color: var(--warn); font-weight: 500; }

.cases { display: grid; gap: 16px; }
.case { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; display: grid; gap: 14px; scroll-margin-top: 16px; }
.case--fail { border-color: var(--fail); }
.case-head { display: flex; justify-content: space-between; align-items: start; gap: 12px; }
.case-head h3 { font-size: 18px; font-weight: 600; margin-top: 2px; }
.case-id { color: var(--muted); }
.fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px 24px; margin: 0; }
.fields div { display: grid; gap: 2px; min-width: 0; }
.fields dt { font: 600 11.5px var(--sans); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.fields dd { margin: 0; overflow-wrap: anywhere; }
.bug-field dd { color: var(--fail); font-weight: 500; }
.shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
figure { margin: 0; display: grid; gap: 6px; }
figcaption { font-size: 12.5px; color: var(--muted); }
.shot { padding: 0; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--sunk); cursor: zoom-in; display: block; width: 100%; }
.shot img { display: block; width: 100%; aspect-ratio: 1400 / 850; object-fit: cover; object-position: right top; }
details summary { cursor: pointer; color: var(--accent); font-size: 13.5px; font-weight: 500; }
details pre { background: var(--sunk); border-radius: 8px; padding: 12px; overflow-x: auto; max-height: 360px; margin: 8px 0 0; }

dialog { border: 0; padding: 0; background: transparent; max-width: min(1400px, 96vw); }
dialog::backdrop { background: rgb(8 12 10 / 0.8); }
dialog img { display: block; max-height: 86vh; width: auto; border-radius: 8px; }
dialog p { color: #fff; margin: 8px 0 0; font-size: 13px; display: flex; justify-content: space-between; gap: 12px; }
dialog button { font: inherit; color: #fff; background: rgb(255 255 255 / 0.15); border: 0; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
@media (max-width: 520px) { body { padding-inline: 16px; } .case { padding: 14px; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>

<div class="wrap">
  <header class="masthead">
    <span class="eyebrow">CometChat Moderation · ${scenarioMode ? 'scenario run' : 'toggle ON/OFF run'}</span>
    <h1>${scenarioMode ? 'Moderation Scenario Board' : 'Moderation Toggle Board'}</h1>
    <div class="meta">
      <span>App <b>${esc(info.appEnv)}</b> (<code>${esc(info.appId)}</code>)</span>
      <span>Started <b>${esc(new Date(info.startedAt).toUTCString())}</b></span>
      <span>Sample app <code>${esc(info.sampleAppCommit.slice(0, 7))}</code></span>
      ${scenarioMode ? '' : `<span>Original rules restored: <b>${esc(info.rulesRestored === undefined ? 'unknown' : info.rulesRestored ? 'yes' : 'NO — run scripts/restore-rules.ts')}</b></span>`}
    </div>
    <div class="note"><p><strong>Isolation:</strong> ${esc(info.isolation)}</p>${info.notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div>
  </header>

  <section aria-labelledby="summary" style="display:grid;gap:14px">
    <h2 id="summary">Summary <small>${executed.length} executed · ${passRate}% pass</small></h2>
    <div class="tiles">
      <div class="tile"><span class="num">${results.length}</span><span class="lbl">Total test cases</span></div>
      <div class="tile tile--pass"><span class="num">${passed}</span><span class="lbl">Passed</span></div>
      <div class="tile tile--fail"><span class="num">${failed}</span><span class="lbl">Failed</span></div>
      <div class="tile tile--skip"><span class="num">${notRun}</span><span class="lbl">Not run</span></div>
      <div class="tile tile--warn"><span class="num">${findings.length}</span><span class="lbl">Findings</span></div>
      <div class="tile tile--warn"><span class="num">${blockedCount}</span><span class="lbl">Messages blocked</span></div>
      <div class="tile"><span class="num">${deliveredCount}</span><span class="lbl">Messages delivered</span></div>
    </div>
    <div class="bar" role="img" aria-label="${passed} passed, ${failed} failed, ${notRun} not run">
      <span style="width:${(passed / results.length) * 100}%;background:var(--pass)"></span>
      <span style="width:${(failed / results.length) * 100}%;background:var(--fail)"></span>
      <span style="width:${(notRun / results.length) * 100}%;background:var(--skip)"></span>
    </div>
    <div class="api"><span>Send API: ${statusList(sendStatuses)}</span>${scenarioMode ? '' : `<span>Toggle API: ${statusList(toggleStatuses)}</span>`}</div>
  </section>

  <section aria-labelledby="grid" style="display:grid;gap:14px">
    <h2 id="grid">${scenarioMode ? 'By scenario' : 'By toggle'} <small>click a result for its evidence</small></h2>
    <div class="table-wrap"><table>
      ${scenarioMode
        ? `<thead><tr><th>Area</th><th>Scenario</th><th>Result</th><th>Checks</th></tr></thead><tbody>${scenarioRows}</tbody>`
        : `<thead><tr><th>Toggle</th><th>Type</th><th>Toggle ON — should block</th><th>Toggle OFF — should deliver</th></tr></thead><tbody>${gridRows}</tbody>`}
    </table></div>
  </section>

  <section aria-labelledby="bugs" style="display:grid;gap:14px">
    <h2 id="bugs">Failed cases &amp; bugs <small>${failures.length}</small></h2>
    <ul class="bugs">${scenarioMode ? scenarioFailureHtml : failureHtml}</ul>
    ${findings.length ? `<h2>Findings <small>${findings.length} · behavior worth reporting</small></h2><ul class="bugs">${scenarioMode ? scenarioFindingHtml : findingHtml}</ul>` : ''}
  </section>

  <section aria-labelledby="evidence" style="display:grid;gap:14px">
    <h2 id="evidence">Evidence by test case <small>screenshots · API responses</small></h2>
    <div class="cases">${scenarioMode ? scenarioCards : caseCards}</div>
  </section>
</div>

<dialog id="viewer" aria-label="Screenshot">
  <img id="viewer-img" alt="" />
  <p><span id="viewer-cap"></span><button type="button" id="viewer-close">Close</button></p>
</dialog>
<script>
  const dlg = document.getElementById('viewer');
  document.querySelectorAll('.shot').forEach((b) =>
    b.addEventListener('click', () => {
      document.getElementById('viewer-img').src = b.dataset.src;
      document.getElementById('viewer-img').alt = b.dataset.caption;
      document.getElementById('viewer-cap').textContent = b.dataset.caption;
      dlg.showModal();
    })
  );
  document.getElementById('viewer-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
</script>
`;

fs.writeFileSync(path.join(dir, 'dashboard.html'), html);
console.log(`Wrote ${path.join(dir, 'dashboard.html')} — ${results.length} cases (${passed} pass, ${failed} fail, ${notRun} not run).`);
