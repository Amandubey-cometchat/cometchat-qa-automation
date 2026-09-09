# CometChat Webhook Automation

Real end-to-end QA automation for CometChat's Webhooks: trigger events via
the CometChat REST API and JS SDK (no UI needed), capture them on a small
Express receiver, and assert deeply on the payload with Playwright Test. No
mocks — every test run hits a real CometChat app and asserts on a real
webhook delivery.

## Architecture

```
webhook-automation/
  src/
    config/
      env.ts               -> resolves APP_ENV, loads .env.<APP_ENV>, prints the banner, blocks unconfirmed prod runs
      prod.config.ts        -> prod policy (valid regions, confirmation gate) — never secrets
      staging.config.ts     -> staging policy
      config.schema.ts       -> the typed EnvironmentConfig shape + runtime validation
    clients/                -> raw API access, nothing else
      cometchat.client.ts   -> low-level REST wrapper (base URL, headers, auth tokens)
      users.client.ts / groups.client.ts / messages.client.ts
      sdk.client.ts         -> real CometChat JS SDK session in a Playwright browser (WebSocket-only triggers)
      moderation.client.ts  -> probe-message senders for moderation testing
      campaigns.client.ts   -> NotImplementedError stub (see Known limitations)
      call-session.client.ts -> real WebRTC session join (@cometchat/calls-sdk-javascript, fake media device) — used by both Calls and Meetings
      (Calls signaling lives in sdk.client.ts + triggers/calls/calls.triggers.ts; Meetings in triggers/meetings/meetings.triggers.ts — see below)
    webhook/                -> the "listener" layer — a test-side client for the deployed receiver
      webhook.listener.ts   -> public facade tests import (re-exports everything below)
      webhook.store.ts      -> reset/fetch events from the receiver
      webhook.waiter.ts     -> expectWebhookEvent / expectSingleWebhookEvent / assertNoWebhookEvent (poll, never fixed sleep)
      webhook.matcher.ts    -> reusable correlation-ID matcher factories
      webhook.correlation.ts -> typed correlation-ID vocabulary (messageId/groupId/userId/...)
      webhook.retry.ts      -> duplicate-delivery detection (settle-window watching)
    registry/                -> single source of truth for every webhook (see below)
    validators/               -> payload assertions, one file per category, extracted out of test bodies
    triggers/                 -> the action that produces a webhook, one file per category (orchestrates clients)
    data/factories/           -> test data generation (fixed users, unique guids/message text)
    utils/                    -> logger, generic retry/poll, timeout budgets, id-generator, cleanup registry
    tests/                    -> one spec file per webhook for GROUP/MESSAGE/USER/MODERATION, all 9 CALLS
                                  triggers, 4 of 6 MEETINGS triggers, and before_message (LEGACY); category
                                  gap files for the rest of meetings/campaign/legacy — see "Legacy webhooks"
                                  below for that category; _shared/ for cross-cutting suites (duplicate-
                                  delivery, negative cases, edge cases)
  schemas/                    -> JSON Schema for the 3 automated categories (group/message/user) —
                                  see "Webhook coverage registry & report"
  scripts/
    setup.ts                 -> fallback: creates the 2 fixed test users if not already seeded on the target app
    cleanup.ts                -> sweeps stray "qa-" groups left by a crashed run
    register-webhooks.ts      -> webhook CRUD via CometChat's Management API (see Known limitations)
    upload-test-results.ts    -> pushes a local test run's results to the deployed receiver
    generate-coverage.ts       -> registry × latest run -> reports/coverage/webhook-coverage.{json,md}
  receiver/                   -> Express service CometChat delivers webhooks to (deployed on Render — see Step 1)
    index.js                 -> POST /webhook, event storage, /dashboard, /test-results
    public/dashboard.html    -> visual inspector: raw events + pass/fail/skip test results
  reports/
    html/                    -> Playwright's own HTML report (generated, gitignored)
    json/                    -> Playwright's JSON report + the run-provenance marker (generated, gitignored)
    coverage/                -> webhook-coverage.{json,md} — the real deliverable, committed
  playwright.config.ts
  tsconfig.json
  package.json
  .env.example
```

**Why this shape**: every functional requirement (env separation, a webhook
registry as single source of truth, real-payload validation, correlation-ID
based waiting, a coverage report) maps to one clearly-responsible layer, and
one shared spec suite runs against whichever environment `APP_ENV` selects —
never a `tests/prod/` vs `tests/staging/` duplication. Two deliberate
deviations from a fully literal per-webhook trigger-file layout: triggers are
grouped one file per category (not one file per action) since most actions
are 1-2 line wrappers around a client call — a separate file per action would
be pure pass-through noise; and `schemas/` only covers the 3 categories with
real, live-captured payloads (group/message/user) — inventing a schema for a
payload shape nobody has ever seen would violate "don't assume payload
fields" (see `src/validators/moderation.validator.ts` etc. for the categories
still pending a real payload).

## Step 0 — Prerequisites

1. A **dedicated CometChat app** per environment (Dashboard → Create App).
2. From that app: **App ID**, **Region**, **REST API Key** (fullAccess scope).
3. A public HTTPS URL for the receiver — a permanent deployment is strongly
   preferred over a local tunnel (see "Receiver hosting" below).
4. Node.js 18+.

## Step 1 — Deploy (or run) the receiver

**Permanent (recommended)**: deploy `receiver/` as its own Web Service on
Render (or Fly/Railway) — root directory `receiver`, build command
`npm install`, start command `npm start`, env vars `BASIC_AUTH_USER` /
`BASIC_AUTH_PASS`. Render assigns a stable URL automatically.

**Local dev alternative**: run it on your machine and expose it with a
tunnel — note the tunnel URL changes every restart, so you'll be re-pasting
it into both `.env.<name>` and the CometChat Dashboard often:

```bash
cd receiver
npm install
cp .env.example .env      # set BASIC_AUTH_USER / BASIC_AUTH_PASS
npm start                 # listens on :4001
```

```bash
cloudflared tunnel --url http://localhost:4001   # or: ngrok http 4001
```

## Step 2 — Configure the webhook

CometChat's per-app REST API key (`COMETCHAT_REST_API_KEY`) **cannot** create
or edit webhooks — that requires a separate Multi-Tenancy Management API key
that only CometChat Sales provisions (see "Known limitations"). Until you
have one, configure the webhook by hand:

1. CometChat Dashboard → your app → Webhooks
2. Add your receiver's URL + `/webhook`, enable Basic Auth with the same
   `BASIC_AUTH_USER`/`BASIC_AUTH_PASS` as `receiver/.env`
3. Enable every individual trigger you want covered — this is a
   **per-trigger** checklist under each category tab (Message/User/Group/etc.),
   not just one toggle per category. It's easy to have a category "on" with
   specific triggers inside it still unchecked.

## Step 3 — Run the tests

```bash
npm install
cp .env.example .env.staging-us   # fill in COMETCHAT_APP_ID, COMETCHAT_REGION,
                                   # COMETCHAT_REST_API_KEY, WEBHOOK_RECEIVER_URL,
                                   # RECEIVER_QUERY_URL — see "Multiple environments"
npm run setup                     # usually a no-op — see "Multiple environments"
npm run test:staging
```

Environment-specific entry points (each loads only that environment's
`.env.<name>` — see "Multiple environments" below):

```bash
npm run test:staging      # APP_ENV=staging-us, no confirmation needed
npm run test:prod:eu      # APP_ENV=prod-eu,  requires the confirmation baked into the script
npm run test:prod:us      # APP_ENV=prod-us,  same
npm run test:prod:in      # APP_ENV=prod-in,  same
```

Every one of these runs the full suite serially against that real CometChat
app (parallel runs would race on the receiver's shared event store — see
`playwright.config.ts`), then regenerates `reports/coverage/webhook-coverage.{json,md}`
for that environment. `npm run test:webhooks` additionally uploads results to
the deployed receiver so its dashboard's Test Results tab reflects them (see
"Receiver hosting").

None of the commands above touch Legacy webhooks — that's a separate,
guarded flow (`npm run test:legacy:prod:eu`, etc.) since it requires a
manual Dashboard toggle that temporarily disables the modern webhook
config these commands depend on. See "Legacy webhooks" below.

Useful variants:
- `npm run test:staging -- --grep group` / `npm run test:prod:eu -- --grep message` —
  just one category (Playwright's own `--grep`, passed through)
- `npm run test:prod:eu -- --grep message_sent` — just one webhook
- `npx playwright test src/tests/message/message-sent.spec.ts` — just one spec file
  (loads `APP_ENV` from your shell — export it first, or prefix the command)
- `npx playwright show-report reports/html` — HTML report after a run
- `npm run coverage` — regenerate the coverage report from the last run without re-running anything
- `npm run typecheck` — `tsc --noEmit` across the whole project
- `npm run cleanup` — sweep any stray `qa-*` groups left by a crashed run

## Step 4 — Watch it live

```
<your receiver URL>/dashboard
```

Two tabs:
- **Webhook Events** — every raw payload CometChat has ever delivered, grouped
  by trigger, persisted in `receiver/data/events-history.json` across restarts
- **Test Results** — the last uploaded test run's pass/fail/skip breakdown.
  Click any row to see the exact assertion error (for a failure) or the
  documented reason (for a skip).

## Receiver hosting

This project's receiver is deployed permanently on Render rather than run
through a local tunnel — Cloudflare's free "quick tunnels" hand out a random
URL on every restart with no way to keep it stable, and the underlying
connection isn't reliable long-term (observed dying silently overnight). A
deployed receiver means the CometChat Dashboard's webhook URL is configured
**once**, permanently.

One consequence: since tests run from a developer's machine but the receiver
runs elsewhere, the receiver can't read `reports/json/results.json` off a
filesystem it doesn't share. `scripts/upload-test-results.ts` POSTs the
report to the receiver's `POST /test-results` endpoint instead — runs
automatically via `npm run test:webhooks`.

## Multiple environments

This suite can target different CometChat apps — a staging app and three
regional production apps — via `src/config/env.ts`, which loads
`.env.<APP_ENV>` instead of a single bare `.env`. Named `APP_ENV` rather than
a generic `TEST_ENV`, deliberately: Production alone spans 3 regions here
(`prod-us`/`prod-eu`/`prod-in`), so "prod" on its own isn't specific enough
to load real config from. `src/config/env.ts`'s exported `environment` field
(`"staging" | "prod"`) is still available for any code that only needs the
coarse distinction — see `prod.config.ts`/`staging.config.ts` for the
per-tier policy (valid regions, confirmation requirement) that key derives.

```bash
npm run test:staging                                  # APP_ENV=staging-us
npm run test:prod:eu                                   # APP_ENV=prod-eu, confirmed
# equivalent, if you need raw playwright flags (e.g. --grep):
APP_ENV=prod-eu CONFIRM_PROD=yes npx playwright test --grep group
```

`APP_ENV` must be one of `staging-us`, `prod-us`, `prod-eu`, `prod-in`. Any
`prod-*` target is refused unless `CONFIRM_PROD=yes` is also set — this
suite creates/deletes groups, sends messages, and bans/blocks users, so a
stray or forgotten `APP_ENV` should never silently run against a real
production app. Every run prints a banner (`Environment: PROD`, `APP_ENV:
prod-eu`, app ID, region) before a single test executes.

**Set up a new environment**:
1. `cp .env.example .env.<name>` and fill in that app's App ID, Region, and REST API Key
2. Deploy a **separate, dedicated** Render receiver for it (don't share one
   across environments — keeps prod and staging fully isolated). Same steps
   as "Step 1" above, just a new Render Web Service from the same repo.
3. Fill in that receiver's URL as `WEBHOOK_RECEIVER_URL`/`RECEIVER_QUERY_URL`
   in the new `.env.<name>` file
4. `APP_ENV=<name> npm run setup` — the suite's two fixed test users
   (`cometchat-uid-1`/`cometchat-uid-2`, see `src/data/factories/user.factory.ts`)
   are CometChat's own Sample App demo users, seeded automatically on app
   creation — this step is usually a no-op, just a safety net for the rare
   app that had sample-data seeding declined
5. Add a **new, separate** webhook on that app in the Dashboard (Step 2 above)
   pointing at the new receiver — never repoint an existing webhook that
   might already drive real business logic on a prod app

## Webhook coverage registry & report

`src/registry/webhook.registry.ts` aggregates one file per category
(`group.registry.ts`, `message.registry.ts`, `user.registry.ts`,
`moderation.registry.ts`, `calls.registry.ts`, `meetings.registry.ts`,
`campaign.registry.ts`) — 51 webhooks total. Each entry carries its category,
what actually triggers it, the automation method (REST/SDK/none), the real
payload fields a passing test asserts on, and a status:

- **AUTOMATED** — a real test exists and asserts on a real, live-verified payload
- **NOT_IMPLEMENTED** — believed achievable with what's already available, just not built yet (with a reason)
- **BLOCKED** — genuinely can't be triggered with what's currently available — missing product module/credentials, or a Dashboard-only human action with no API equivalent (with a reason)

`scripts/generate-coverage.ts` (wired into every `test:*` script, or run
standalone as `npm run coverage`) cross-references the registry against the
most recent local Playwright run for whichever environment actually produced
it — tagged via a run-provenance marker (`reports/json/.run-env.json`,
stamped by `playwright.config.ts` at the start of each run) rather than this
script's own environment resolution, specifically so a standalone `npm run
coverage` invocation can never mislabel a stale, different environment's
results (this happened once during development — see git history). It prints
a console report and writes/updates:
- `reports/coverage/webhook-coverage.json` — accumulates one slice per environment, so running staging today and prod-eu tomorrow builds a combined multi-environment picture rather than overwriting each other
- `reports/coverage/webhook-coverage.md` — the same data as a table

**Current coverage (last run, prod-eu, 2026-09-04): 24 AUTOMATED (all pass), 2 NOT_IMPLEMENTED, 25 BLOCKED, 51 total.**

**Adding a new webhook**:
1. Add one entry to the relevant `src/registry/<category>.registry.ts` (`id`, `trigger`, `expectedEvent`, `automationMethod`, `expectedPayloadKeys`, and either `status: 'AUTOMATED'` with `specFile`/`testTitleMatch` pointing at a real test, or `status: 'BLOCKED'`/`'NOT_IMPLEMENTED'` with a `reason`)
2. If it needs a new way to reach CometChat, add it to the relevant `src/clients/*.client.ts`
3. Add (or extend) a trigger function in `src/triggers/<category>/<category>.triggers.ts`
4. Add a validator function in `src/validators/<category>.validator.ts`
5. Add a JSON schema entry in `schemas/<category>/` once you've captured a real payload (optional, but keep it real — no invented shapes)
6. Add the spec file under `src/tests/<category>/`
7. Run it, confirm it passes for real, then `npm run coverage` to update the report

Nothing else needs to change — every layer above reads from the registry or from what the previous layer produced.

## Known limitations

Not every CometChat webhook trigger can be exercised by REST alone.
`group_member_joined`/`left`, delivery/read receipts, the group-only
aggregate receipts (`message_delivered_to_all`/`message_read_by_all`), and
connection status only fire from a real, connected SDK client (WebSocket) —
`src/clients/sdk.client.ts` covers these for real by driving the actual
CometChat JS SDK inside a Playwright-controlled browser, logged in via a
server-generated Auth Token. Not a mock — a real client session.

What's still genuinely out of reach, documented as explicit, reasoned gaps
(not silently omitted) so they stay visible — see the registry files for the
authoritative, per-webhook version of this:

| Trigger(s) | Why it's blocked | Where |
| --- | --- | --- |
| Webhook create/update/enable/disable/delete, add/remove trigger | Needs a Multi-Tenancy Management API key (`COMETCHAT_MGMT_KEY`/`SECRET`) from CometChat Sales — the per-app REST key 404s against `apimgmt.cometchat.io`. Not currently tracked as tests (removed — see git history for the prior explicit-skip version); `scripts/register-webhooks.ts` still automates this the moment those credentials exist | `scripts/register-webhooks.ts` |
| `recording_generated`, `transcription_generated` | Recording needs confirmation it's enabled for these apps (async — real processing delay after the session ends); transcription is a separate paid Rev.ai-backed extension needing its own account and Dashboard setup, not something more research can resolve. All 9 Calls and the other 4 Meetings triggers are automated — see `src/triggers/calls/calls.triggers.ts`, `meetings.triggers.ts` | `src/registry/meetings.registry.ts` |
| Campaign/Notification events (10) | No Campaigns module integration exists, and CometChat's entire current documentation has zero results for "campaign" (searched live 2026-09-09) — needs either a DevTools network capture of the Dashboard's Campaign UI, or direct confirmation from CometChat | `src/registry/campaign.registry.ts` |
| `moderation_manual_approved` | Dashboard-only human action (an admin manually approving flagged content) — no REST/SDK equivalent exists | `src/registry/moderation.registry.ts` |
| `after_message`, `message_delivery_receipt`/`message_read_receipt`/`after_connection_status_changed` (LEGACY) | Each still needs its own live capture the same way `before_message` got one — see "Legacy webhooks" below for why these can't just be run like everything else | `src/registry/legacy.registry.ts` |

## UI-driven testing

`src/clients/sample-app.client.ts` drives CometChat's own official React
Sample App via Playwright — a real, visible browser clicking through a real
chat UI (typing into the composer, hitting Send), instead of a REST call or
a raw SDK method call. Login flow and selectors come directly from
CometChat's own E2E suite that ships in that repo, not guesswork.

**Setup** (not part of this repo — cloned locally, gitignored):

```bash
git clone https://github.com/cometchat/cometchat-sample-app-react.git sample-app
cd sample-app/sample-app
npm install
npm run dev   # dev server — note the port it picks (falls back if 3005 is taken)
```

Needs `COMETCHAT_AUTH_KEY` set in `.env.<APP_ENV>` — a client-side (Auth
Only scope) credential from the Dashboard's Credentials panel, distinct
from `COMETCHAT_REST_API_KEY` and never sent to the REST API. If the dev
server isn't on `localhost:3006`, set `SAMPLE_APP_URL` to match.

**Known finding**: `message_sent` does not fire for messages sent through
the SDK's real-time path at all (confirmed live — true for the Sample App
*and* a raw `CometChat.sendMessage()` call, so it's not UI-specific) —
only for REST-created messages, which is how every message in this
project has been sent until now. This isn't fixable from here; it means
UI-driven testing can't add new coverage for `message_sent` itself, but
remains useful for triggers that only fire from a live connected client
(moderation, receipts, connection status) and for visually demoing the
suite.

## Legacy webhooks

CometChat has a second, older webhook mechanism — 5 triggers
(`after_message`, `before_message`, `message_delivery_receipt`,
`message_read_receipt`, `after_connection_status_changed`) — completely
separate from the ~56-trigger system the rest of this suite is built
around. Confirmed live: **a given app can only have one system active at
a time**. Switching an app to Legacy mode in the Dashboard disables the
modern webhook config every other automated test in this project depends
on, and there is no API to toggle between them — searched CometChat's
entire Webhooks Management API reference (2026-09-09): zero mentions of
"legacy" anywhere in it.

Given that, Legacy tests can't run as part of the regular suite, or
safely without a deliberate, guarded process. `scripts/test-legacy.ts` is
that process:

```bash
npm run test:legacy:prod:eu      # also test:legacy:prod:us / :prod:in / :staging
```

It:

1. Prints exact Dashboard instructions to switch to Legacy mode, and
   waits for your explicit confirmation before doing anything.
2. Sends one real "canary" message and confirms a Legacy-only trigger
   actually fires — refuses to proceed otherwise, rather than running the
   whole suite against a config that silently didn't take.
3. Runs the real Legacy spec files (`src/tests/legacy/`).
4. **Always** (pass, fail, or crash) prompts you to switch back to Modern
   mode, then runs the canary check again in reverse to prove the revert
   actually worked — a forgotten revert fails loudly here instead of
   silently breaking the rest of the automated suite on their next run.

**Status**: `before_message` is automated (live-verified 2026-09-09,
prod-eu). The other 4 still need their own live capture before they can
be trusted — see `src/registry/legacy.registry.ts`.

**`before_message` is the one synchronous webhook in this whole
project** — CometChat calls the receiver and waits for the response,
which can inject metadata (`{"@injected": {"webhooks": {"<id>": {...}}}}`)
or drop the message entirely (`{"action": "do_not_propagate"}`).
`receiver/index.js` responds with an empty object for it specifically —
neither documented shape, so CometChat delivers the message unmodified —
distinct from every other trigger's fire-and-forget `{ok:true, id}` ack.

## CometChat's built-in Moderation Engine

If your app has Moderation enabled (Dashboard → your app → Moderation), be
aware it can silently block test messages before any `message_sent` webhook
fires — observed live (pre-2026-09-03, prod-eu): a raw 10+ digit timestamp
embedded in message text got pattern-matched as a phone number ("Contact
details filter"), and a single character repeated thousands of times read as
spam. This suite avoids both — see `timestampToken()`/`fillerText()` in
`src/data/factories/message.factory.ts` — but flood/rate-style rules can
still produce inconsistent false positives on otherwise-safe traffic under
rapid, repeated test runs.

**Update, 2026-09-04**: re-probed live against prod-eu with the same
phone-pattern text that previously triggered a block (`src/clients/moderation.client.ts`'s
`sendPhonePatternMessage`) — it now sends cleanly as `message_sent`, not
`moderation_engine_blocked`. The message's own metadata shows a moderation
extension did run (`metadata['@injected'].extensions['human-moderation'].success: true`),
but no moderation **webhook** fired either way. Most likely, based on this
project's prior experience with Group triggers (a category can show "on"
while individual trigger checkboxes are unchecked): the Moderation trigger
category needs to be explicitly enabled in the webhook's trigger
configuration. Needs a Dashboard check — see `src/registry/moderation.registry.ts`.

## `scripts/register-webhooks.ts`

Automates the manual Dashboard step in Step 2, once you have real
`COMETCHAT_MGMT_KEY`/`COMETCHAT_MGMT_SECRET` from CometChat Sales. Fails fast
with a clear message if they're not set. See the file's header comment for
details (its exact endpoint paths are transcribed from docs, not
live-verified, since this project has never had Management API credentials
to test against).

## Notes

- The receiver keeps two stores: an in-memory one (`events`) that tests reset
  between specs for isolation, and a disk-persisted one (`history`, in
  `receiver/data/events-history.json`) that the dashboard reads and that
  survives restarts. `DELETE /webhook/events` clears only the former;
  `DELETE /webhook/history` clears the latter.
- Webhooks are asynchronous — `src/webhook/webhook.waiter.ts`'s polling
  helpers retry for a few seconds before failing with a debuggable timeout
  error listing what *did* arrive in that window, rather than a bare "timed out".
- Every test's created resources are torn down via `src/utils/cleanup.ts`'s
  per-test registry (`registerCleanup(...)` + a shared `afterEach`) — safe as
  a module-level stack specifically because this suite runs serially
  (`playwright.config.ts`: `fullyParallel: false, workers: 1`).
- Swap the in-memory/JSON-file receiver storage for Redis/Postgres before
  using this as permanent shared CI infrastructure with concurrent runs.
