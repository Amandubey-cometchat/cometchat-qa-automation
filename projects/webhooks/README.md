# CometChat Webhook Automation

Real end-to-end QA automation for CometChat's Webhooks: trigger events via
the CometChat REST API and JS SDK (no UI needed), capture them on a small
Express receiver, and assert deeply on the payload with Playwright Test. No
mocks — every test run hits a real CometChat app and asserts on a real
webhook delivery.

## Quick Start

1. Deploy a receiver — one click, no Render account setup beyond signing in:

   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Amandubey-cometchat/cometchat-webhook-automation)

   Takes about a minute. When it's done, open the new service's
   "Environment" tab and note its URL and the auto-generated
   `BASIC_AUTH_USER`/`BASIC_AUTH_PASS` — you'll paste these into step 3.

2. Get your CometChat **App ID**, **Region**, and a **REST API Key**
   (fullAccess scope) from your CometChat Dashboard → your app.

3. Clone and run:

   ```bash
   git clone <this repo>
   cd webhook-automation/projects/webhooks
   ./run.sh        # macOS/Linux
   run.bat         # Windows
   ```

   `run.sh`/`run.bat` check Node, install dependencies and the Playwright
   browser only if they're actually missing, then walk you through a
   one-time setup wizard asking for exactly the values from steps 1–2 (it
   prints the same deploy button again right when it asks for the receiver
   URL, in case you skipped step 1). No manual `npm install`, no manual
   `npx playwright install`, no editing source files.

4. One thing nothing can automate: in the CometChat Dashboard → your app →
   Webhooks, add the receiver URL from step 1 (+ `/webhook`) with the same
   Basic Auth, and check the individual triggers you want covered — this
   requires Dashboard access CometChat doesn't expose over the REST API
   this project uses (see "Developer Mode → Step 2").

## Requirements

Only what genuinely can't be automated:

- **Node.js 18+** — `run.sh`/`run.bat` check this and tell you exactly what
  to do if it's missing or too old.
- **A CometChat app** (Dashboard → Create App) with its **App ID**,
  **Region**, and **REST API Key** (fullAccess scope).
- **A deployed webhook receiver** with a public HTTPS URL — the "Deploy to
  Render" button above handles this in about a minute; see "Developer Mode
  → Receiver hosting" for the manual alternative (Fly/Railway/local tunnel).
- **The webhook itself configured in the CometChat Dashboard**, pointed at
  your receiver, with the triggers you want enabled — see "Developer Mode →
  Step 2" below. This one step has no API-based shortcut (see there for why).

Everything else — installing dependencies, the Playwright browser, deploying
the receiver, writing `.env.<name>` files, running the right command — is
handled for you.

## First Run

The first time you run `./run.sh` (or `run.bat`) with no environment
configured, you'll see:

```
Checking Node.js...
✓ Node.js v20.11.0 found

Checking dependencies...
Installing dependencies...
✓ Dependencies installed

Checking Playwright browser (chromium)...
✓ Browser ready

No environment is configured yet — let's set one up.

First-time setup for "staging-us"
CometChat App ID:
Region (us / eu / in) [us]:
REST API Key (fullAccess scope):
Webhook Receiver URL (your deployed receiver + '/webhook'):
Receiver Basic Auth username [qa]:
Receiver Basic Auth password:
Receiver base URL (same host, no /webhook path):

Saved .env.staging-us
```

This writes `.env.staging-us` for you and only asks once — a normal run
after that goes straight to the menu. Values come from your CometChat
Dashboard (App ID/Region/REST API Key) and your deployed receiver's own
URL/Basic Auth credentials (see "Developer Mode → Step 1" if you haven't
deployed one yet). Secret fields are entered hidden (echoed as `*`), never
printed back in full.

You can re-run setup any time, or configure additional environments
(`prod-eu`/`prod-us`/`prod-in`), from the menu's "Configure an environment"
option.

## CLI Usage

**Interactive** — `./run.sh` (or `npm run webhook`) with no arguments opens:

```
============================================
  CometChat Webhook Automation
============================================
  Environments configured: 1/4

  1) Run tests
  2) Validate configuration
  3) Configure an environment (setup wizard)
  4) Clean up stray test data
  5) Open last HTML report
  6) Exit
```

"Run tests" asks which environment, then which webhooks (all, or one
category — Group / Message / Calls & Meetings / Campaign / User /
Moderation / Legacy / Notification) as two short numbered prompts, so no single screen has
more than about 8 choices.

**Non-interactive** — same actions as direct commands, for scripting/CI:

```bash
./run.sh                    # interactive menu
./run.sh validate [env]     # validate configuration (default env: staging)
./run.sh clean [env]        # sweep stray qa-* test data
./run.sh report             # open the last HTML report

./run.sh all [env]          # run every webhook test
./run.sh group [env]        # Group webhooks
./run.sh message [env]      # Message webhooks
./run.sh calls [env]        # Calls & Meetings webhooks
./run.sh campaign [env]     # Campaign webhooks
./run.sh user [env]         # User webhooks
./run.sh moderation [env]   # Moderation webhooks
./run.sh legacy [env]       # guarded Legacy flow (see Developer Mode)
./run.sh notification [env] # Email/SMS/Push custom providers (see Notifications)
```

`env` is one of `staging` (default), `prod:eu`, `prod:us`, `prod:in`. Bare
`prod` is refused on purpose — production is 3 separate regional apps here,
never one generic target (see "Production" below).

Everything above is a thin wrapper around the same underlying pipeline this
project has always used (`scripts/open-dashboard.ts` →
`scripts/clear-history.ts` → `playwright test` →
`scripts/upload-test-results.ts` → `scripts/generate-coverage.ts`) — power
users can still run the original `npm run test:staging` /
`npm run test:prod:eu` etc. directly; nothing about them changed.

## Configuration

Each environment's settings live in its own `.env.<name>` file
(`.env.staging-us`, `.env.prod-us`, `.env.prod-eu`, `.env.prod-in`),
git-ignored, never committed. The setup wizard writes these for you from
`.env.example`'s template. Required fields:

| Variable | What it is |
|---|---|
| `COMETCHAT_APP_ID` | From CometChat Dashboard → your app |
| `COMETCHAT_REGION` | `us` / `eu` / `in` |
| `COMETCHAT_REST_API_KEY` | fullAccess-scope REST API key |
| `WEBHOOK_RECEIVER_URL` | Your deployed receiver + `/webhook` |
| `WEBHOOK_BASIC_AUTH_USER` / `_PASS` | Must match the receiver's own Basic Auth config |
| `RECEIVER_QUERY_URL` | Same receiver, base URL, no path |

Two optional fields for advanced cases (Management API access, a
dedicated-deployment CometChat app) are documented inline in
`.env.example` — the wizard doesn't ask for these since most setups don't
need them.

**Prefer editing files by hand?** `cp .env.example .env.staging-us` and
fill it in yourself — the wizard is a convenience, not a requirement.
`./run.sh validate` checks whichever path you took.

## Staging

```bash
./run.sh                 # then choose "Staging" from the menu
./run.sh all staging     # or non-interactively
```

Staging needs no confirmation to run — it isn't expected to carry real
production traffic, so this is the safe default for everyday use and for
CI (see "CI/CD" below).

## Production

Production spans **three separate regional apps** (`prod-us`, `prod-eu`,
`prod-in`) — there's no single generic "prod" target on purpose, since a
stray or forgotten environment variable should never silently run against
the wrong real app. Every prod run requires explicit confirmation, built
into the command itself:

```bash
./run.sh all prod:eu     # or prod:us / prod:in
```

**This suite creates/deletes groups, sends real messages, and bans/blocks
users** against whichever app you point it at — production runs cause real
side effects on a real CometChat app. Every run prints a banner
(`Environment: PROD`, App ID, region) before a single test executes so
it's unambiguous what's about to happen.

## Webhook Categories

| Category | What it covers |
|---|---|
| Group | Group create/update/delete, membership, bans, ownership |
| Message | Send/edit/delete/react, mentions, delivery & read receipts |
| Calls & Meetings | Call signaling + real WebRTC session lifecycle |
| Campaign | Notifications, feed items, push notifications |
| User | Block/unblock, connection status |
| Moderation | CometChat's built-in Moderation Engine |
| Legacy | CometChat's older, separate 5-trigger webhook system — guarded, interactive (see Developer Mode) |
| Notification | Custom Email/SMS Provider fallback notifications — needs its own Dashboard setup, see below |

Full per-webhook status (automated / not yet implemented / genuinely
blocked, and why) lives in `src/registry/*.registry.ts` and is what
generates both `reports/coverage/webhook-coverage.md` and the receiver
dashboard's category tabs — see "Developer Mode → Webhook coverage
registry & report".

## Notifications

CometChat's Notifications feature (cometchat.com/docs/notifications) is a
**third, separate system** from both the main Webhooks config every other
category in this README depends on, and from Campaign's own push
notifications (a different module). Email and SMS send a fallback when a
message goes unread; Push fires for a much broader set of actions (chat
messages, calls, reactions, group membership changes). All three are
configured the same way — Dashboard → Settings → Notifications → Providers
→ a **Custom Email/SMS/Push Provider** webhook, each with its own URL
field, separate from (but reusable as) your main webhook URL.

**Setup, per environment**:
1. Dashboard → Settings → Notifications → Providers
2. Expand **Email Notifications** → **Custom Email Provider** → the gear icon
3. **URL**: your receiver's webhook URL — same value as `WEBHOOK_RECEIVER_URL` in `.env.<name>` (e.g. `https://your-receiver.onrender.com/webhook`)
4. Leave **"Trigger only if email address is stored with CometChat"** OFF — the fixed QA test users (`cometchat-uid-1`/`cometchat-uid-2`) have no real email on file, so this must fire regardless
5. **Toggle "Enable Basic Auth" ON** and use the same `WEBHOOK_BASIC_AUTH_USER`/`_PASS` as everything else in this project — the receiver's existing auth check is unconditional, so leaving this off means every call 401s silently
6. Save, then toggle **Enable** on for Email Notifications itself (top-right of that row)
7. Repeat steps 2–6 for **SMS Notifications** → **Custom SMS Provider**, and **Push Notifications** → **Custom Push Notification Provider**

No real email/SMS/push is ever actually sent to anyone by doing this — the
"provider" you're pointing at *is* this project's own receiver, which only
logs and acknowledges. Nothing forwards to a real SendGrid/Twilio/FCM/etc.

**Run it**:
```bash
./run.sh notification staging   # or prod:eu / prod:us / prod:in
```
The CLI will ask you to confirm the above is actually configured for that
environment first (these tests are excluded from every other run by
default — see `playwright.config.ts`'s `RUN_NOTIFICATION` gate — so an
unconfigured environment never produces spurious failures elsewhere).

**Status**: all three are live-verified and `AUTOMATED`.

| Trigger | Verified on | Live-measured latency |
|---|---|---|
| `push-notification-payload-generated` | prod-eu, prod-us | ~1.1s |
| `email-notification-payload-generated` | prod-us | ~61.8s |
| `sms-notification-payload-generated` | prod-us | ~60.4s |

Email/SMS genuinely take about a minute; push is near-instant. That's why
`NOTIFICATION_TIMEOUT_MS` is 90s **and** each notification spec calls
`test.setTimeout(NOTIFICATION_TEST_TIMEOUT_MS)` — `playwright.config.ts`'s
global 30s per-test timeout would otherwise kill the email/SMS waits
mid-flight and report a misleading "Test timeout" instead of a real
"webhook never arrived" failure.

They remain behind the `RUN_NOTIFICATION=1` gate because each is only
configured on the environments listed above — running them elsewhere would
fail for lack of Dashboard setup, not because of a regression.

**Correction, 2026-09-15**: an earlier version of this section claimed
Push had no Custom Provider webhook at all, based on 2 doc pages that
turned out to be incomplete (the real page,
`notifications/custom-providers.md`, was only found via the docs' own
`llms.txt` index) — a live screenshot of the actual Dashboard proved that
claim wrong. Worth remembering: a doc URL not resolving isn't proof a
feature doesn't exist.

## Reports

After a run:

```
============================================
Webhook Automation Result
============================================
Passed:   13
Failed:   2
Flaky:    0
Skipped:  0
Duration: 187.4s

Report:   reports/html/index.html
Coverage: reports/coverage/webhook-coverage.md
============================================
```

- `reports/html/` — Playwright's own interactive HTML report (`./run.sh
  report` opens it, or `npx playwright show-report reports/html`)
- `reports/json/` — machine-readable results, consumed by the coverage
  generator and uploaded to the receiver dashboard
- `reports/junit/` — JUnit XML, for CI systems that consume it
  (GitHub Actions test summaries, GitLab/Jenkins)
- `reports/coverage/` — `webhook-coverage.{json,md}`, the real committed
  deliverable: every webhook's automation status per environment
- `logs/<date>-<env>.log` — the full raw output of that run, with any
  API key/Basic Auth values automatically redacted, for pasting into a bug
  report without leaking credentials
- `<receiver URL>/dashboard` — live view of every raw webhook payload
  received, plus the last uploaded run's pass/fail/skip breakdown

## Troubleshooting

**"Webhook receiver unreachable"** — run `./run.sh validate`. Either the
receiver isn't deployed, `WEBHOOK_RECEIVER_URL`/`RECEIVER_QUERY_URL` in
your `.env.<name>` is wrong, or it's a free-tier host (e.g. Render) that
spun down and needs a moment to wake up on the next request.

**"CometChat REST API credentials invalid"** — double-check
`COMETCHAT_APP_ID`/`COMETCHAT_REGION`/`COMETCHAT_REST_API_KEY` against the
CometChat Dashboard; the key must have fullAccess scope.

**A test times out waiting for a webhook that never arrives** — this is
almost always a Dashboard configuration gap, not a bug in this suite: open
`<receiver URL>/dashboard`, check the failing test's category tab, and
confirm that *specific* trigger's checkbox is enabled under CometChat
Dashboard → your app → Webhooks. It's easy to have a category "on" with
individual triggers inside it still unchecked.

**"No environment is configured yet" keeps appearing** — `./run.sh`
detects a missing/incomplete `.env.<name>` by checking for the same
required fields `./run.sh validate` checks; run validate to see exactly
what's missing.

**Something else** — `./run.sh validate` is the first thing to run for any
unclear failure; its checklist output says exactly what's wrong and what to
fix. Full run logs are in `logs/<date>-<env>.log`.

## CI/CD

**GitHub Actions** — `.github/workflows/webhook-tests.yml` (at the repo
root — GitHub only reads workflows from there; it runs inside this folder
via `working-directory`) is a ready
example: manual trigger (`workflow_dispatch`), runs the staging suite
(matching this project's own safety posture — production needs a human
confirmation, not something a CI job should do unattended), uploads
`reports/html`, `reports/junit`, `reports/coverage`, and `logs` as
artifacts. Configure `COMETCHAT_APP_ID`, `COMETCHAT_REGION`,
`COMETCHAT_REST_API_KEY`, `WEBHOOK_RECEIVER_URL`, `WEBHOOK_BASIC_AUTH_USER`,
`WEBHOOK_BASIC_AUTH_PASS`, `RECEIVER_QUERY_URL` as repository secrets
before running it.

**GitLab CI / Jenkins** — the same three commands work anywhere Node is
available: `npm ci`, `npx playwright install --with-deps chromium`,
`npx tsx cli/index.ts all staging` (after writing `.env.staging-us` from
your CI system's own secrets store, the same way the GitHub workflow does).

**Docker** — optional/advanced, not required for local use:

```bash
docker compose run --rm tests                                    # full staging suite
docker compose run --rm tests npx tsx cli/index.ts group staging # one category
```

`Dockerfile` builds an image with Node, this project's dependencies, and
the Playwright chromium browser pre-installed. `docker-compose.yml` also
has a `receiver` service for local receiver development — the normal flow
still assumes an already-deployed Render receiver, not this container.

None of this is required for local use — `./run.sh`/`run.bat` remain the
primary path.

## Developer Mode

Everything below is for anyone modifying this project's tests, clients, or
registry — not needed to just run the suite.

### Architecture

```
projects/webhooks/            (this project; the repo root holds only
                                .github/, render.yaml and projects/)
  run.sh / run.bat            -> cross-platform bootstrap: Node/deps/browser check, hands off to cli/
  cli/
    index.ts                  -> main entry (menu + non-interactive commands) — npm run webhook
    wizard.ts                 -> first-run/reconfigure .env.<name> setup
    validate.ts                -> config + connectivity validation — npm run validate
    lib/
      config-check.ts          -> missing/invalid .env.<name> detection (never imports src/config/env.ts — see its header comment)
      pipeline.ts               -> cross-platform orchestration of open-dashboard -> clear-history -> playwright test -> upload-results -> generate-coverage
      file-logger.ts            -> logs/<date>-<env>.log with secret redaction
      open.ts                   -> cross-platform "open a URL" helper
  src/
    config/
      env.ts               -> resolves APP_ENV, loads .env.<APP_ENV>, prints the banner, blocks unconfirmed prod runs
      prod.config.ts        -> prod policy (valid regions, confirmation gate) — never secrets
      staging.config.ts     -> staging policy
      config.schema.ts       -> the typed EnvironmentConfig shape + runtime validation (REQUIRED_KEYS is what cli/wizard.ts and cli/lib/config-check.ts reuse)
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
    tests/                    -> one spec file per webhook, one category gap file per category with
                                  non-automated entries (registry-driven skip tests), _shared/ for
                                  cross-cutting suites (duplicate-delivery, negative cases, edge cases)
  schemas/                    -> JSON Schema for the 3 automated categories (group/message/user) —
                                  see "Webhook coverage registry & report"
  scripts/
    setup.ts                 -> fallback: creates the 2 fixed test users if not already seeded on the target app
    cleanup.ts                -> sweeps stray "qa-" groups left by a crashed run
    register-webhooks.ts      -> webhook CRUD via CometChat's Management API (see Known limitations)
    upload-test-results.ts    -> pushes a local test run's results to the deployed receiver
    generate-coverage.ts       -> registry × latest run -> reports/coverage/webhook-coverage.{json,md}
    generate-trigger-categories.ts -> registry -> receiver/public/trigger-categories.json (dashboard category grouping)
    test-legacy.ts             -> guarded, interactive Legacy webhook flow — see "Legacy webhooks"
  receiver/                   -> Express service CometChat delivers webhooks to (deployed on Render — see Step 1)
    index.js                 -> POST /webhook, event storage, /dashboard, /test-results
    public/dashboard.html    -> visual inspector: raw events + pass/fail/skip test results
    Dockerfile                -> optional, local/dev use only (docker-compose.yml's `receiver` service)
  reports/
    html/                    -> Playwright's own HTML report (generated, gitignored)
    json/                    -> Playwright's JSON report + the run-provenance marker (generated, gitignored)
    junit/                    -> JUnit XML for CI systems (generated, gitignored)
    coverage/                -> webhook-coverage.{json,md} — the real deliverable, committed
  logs/                       -> per-run CLI logs, secrets redacted (generated, gitignored)
  Dockerfile / docker-compose.yml -> optional/advanced (see "CI/CD")
  (../../.github/workflows/   -> example CI, at the repo root — see "CI/CD")
  (../../render.yaml          -> Render Blueprint for receiver/, at the repo root)
  playwright.config.ts
  tsconfig.json
  package.json
  .env.example
```

**Why this shape**: every functional requirement (env separation, a webhook
registry as single source of truth, real-payload validation, correlation-ID
based waiting, a coverage report) maps to one clearly-responsible layer, and
one shared spec suite runs against whichever environment `APP_ENV` selects —
never a `tests/prod/` vs `tests/staging/` duplication. `cli/` is a thin
orchestration layer on top of this, not a parallel implementation — it
shells out to the same `scripts/*.ts` files in the same order, and never
imports `src/config/env.ts` directly (that module fail-fast-loads config at
*import time* by design, which is exactly right for a test run but wrong
for a CLI trying to detect and gracefully fix missing config — see
`cli/lib/config-check.ts`'s header comment). Two further deliberate
deviations from a fully literal per-webhook trigger-file layout: triggers are
grouped one file per category (not one file per action) since most actions
are 1-2 line wrappers around a client call — a separate file per action would
be pure pass-through noise; and `schemas/` only covers the 3 categories with
real, live-captured payloads (group/message/user) — inventing a schema for a
payload shape nobody has ever seen would violate "don't assume payload
fields" (see `src/validators/moderation.validator.ts` etc. for the categories
still pending a real payload).

### Step 0 — Prerequisites

1. A **dedicated CometChat app** per environment (Dashboard → Create App).
2. From that app: **App ID**, **Region**, **REST API Key** (fullAccess scope).
3. A public HTTPS URL for the receiver — a permanent deployment is strongly
   preferred over a local tunnel (see "Receiver hosting" below).
4. Node.js 18+.

### Step 1 — Deploy (or run) the receiver

**One-click (recommended)**: the "Deploy to Render" button in Quick Start
above reads the repo-root `render.yaml` (Render only looks there) and
provisions this project's `receiver/` as its own Render Web
Service automatically — root directory, build/start commands, and a
securely auto-generated `BASIC_AUTH_PASS` are all pre-filled. This is the
same result as the manual steps below, just without doing them by hand.

**Manual (Render, or Fly/Railway instead)**: deploy `receiver/` as its own
Web Service — root directory `receiver`, build command `npm install`,
start command `npm start`, env vars `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`.
Render assigns a stable URL automatically.

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

### Step 2 — Configure the webhook

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

### Original npm scripts (still work exactly as before)

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

### Receiver hosting

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
automatically via `npm run test:webhooks` (and via `cli/lib/pipeline.ts`'s
`runSuite`, which every `./run.sh` test command goes through).

### Multiple environments

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

**Set up a new environment**: `./run.sh` → "Configure an environment" walks
through this interactively. The manual equivalent:
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

### Webhook coverage registry & report

`src/registry/webhook.registry.ts` aggregates one file per category
(`group.registry.ts`, `message.registry.ts`, `user.registry.ts`,
`moderation.registry.ts`, `calls.registry.ts`, `meetings.registry.ts`,
`campaign.registry.ts`, `legacy.registry.ts`) — 61 webhooks total across 8
categories. Each entry carries its category, what actually triggers it, the
automation method (REST/SDK/none), the real payload fields a passing test
asserts on, and a status:

- **AUTOMATED** — a real test exists and asserts on a real, live-verified payload
- **NOT_IMPLEMENTED** — believed achievable with what's already available, just not built yet (with a reason)
- **BLOCKED** — genuinely can't be triggered with what's currently available — missing product module/credentials, or a Dashboard-only human action with no API equivalent (with a reason)

`scripts/generate-coverage.ts` (wired into every `test:*` script and every
`./run.sh` test command, or run standalone as `npm run coverage`)
cross-references the registry against the most recent local Playwright run
for whichever environment actually produced it — tagged via a
run-provenance marker (`reports/json/.run-env.json`, stamped by
`playwright.config.ts` at the start of each run) rather than this script's
own environment resolution, specifically so a standalone `npm run coverage`
invocation can never mislabel a stale, different environment's results
(this happened once during development — see git history). It prints a
console report and writes/updates:
- `reports/coverage/webhook-coverage.json` — accumulates one slice per environment, so running staging today and prod-eu tomorrow builds a combined multi-environment picture rather than overwriting each other
- `reports/coverage/webhook-coverage.md` — the same data as a table

**Current coverage** changes with every run — `reports/coverage/webhook-coverage.md`
is the live source of truth, not a number pinned here. As of this writing,
its per-environment totals (out of 61 tracked webhooks, 8 NOT_IMPLEMENTED
and 4 BLOCKED consistently across all four) are prod-eu 38 passed/1 failed,
prod-us 46 passed/2 failed, prod-in 45 passed/3 failed, staging-us
9 passed/2 failed — staging's lower passed count reflects known flakiness
in that environment's webhook delivery, not a regression; see the file
itself for exactly which webhooks are failing where.

**Adding a new webhook**:
1. Add one entry to the relevant `src/registry/<category>.registry.ts` (`id`, `trigger`, `expectedEvent`, `automationMethod`, `expectedPayloadKeys`, and either `status: 'AUTOMATED'` with `specFile`/`testTitleMatch` pointing at a real test, or `status: 'BLOCKED'`/`'NOT_IMPLEMENTED'` with a `reason`)
2. If it needs a new way to reach CometChat, add it to the relevant `src/clients/*.client.ts`
3. Add (or extend) a trigger function in `src/triggers/<category>/<category>.triggers.ts`
4. Add a validator function in `src/validators/<category>.validator.ts`
5. Add a JSON schema entry in `schemas/<category>/` once you've captured a real payload (optional, but keep it real — no invented shapes)
6. Add the spec file under `src/tests/<category>/`
7. Run it, confirm it passes for real, then `npm run coverage` to update the report

Nothing else needs to change — every layer above reads from the registry or from what the previous layer produced. The CLI's category menu/grep filters (`cli/index.ts`'s `grepForCategories`) are also registry-driven, so a new category or webhook shows up there automatically.

### Known limitations

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
| `after_campaign_failed` | No reliable way found to trigger a genuine campaign failure — a fake/nonexistent recipient still produces `after_campaign_completed`, not `after_campaign_failed`. The other 9 of 10 Campaign triggers are automated, including all 3 push-notification ones and `after_feed_item_interacted` (neither needed real push infrastructure — see `src/triggers/campaign/campaign.triggers.ts`) | `src/registry/campaign.registry.ts` |
| `moderation_manual_approved` | Dashboard-only human action (an admin manually approving flagged content) — no REST/SDK equivalent exists | `src/registry/moderation.registry.ts` |
| `after_message`, `message_delivery_receipt`/`message_read_receipt`/`after_connection_status_changed` (LEGACY) | Each still needs its own live capture the same way `before_message` got one — see "Legacy webhooks" below for why these can't just be run like everything else | `src/registry/legacy.registry.ts` |

**Real platform finding, not a gap in this project**: `message_sent` does
not fire at all for messages sent through the SDK's real-time path —
confirmed live via both a UIKit send and a raw `CometChat.sendMessage()`
call. Only REST-created messages fire it, which is why every message in
this suite is sent via REST (`src/clients/messages.client.ts`), never SDK.

### Legacy webhooks

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
that process (also reachable as `./run.sh legacy <env>` or the menu's
Legacy option, both of which route straight to this same guarded script,
never through the regular pipeline):

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

### CometChat's built-in Moderation Engine

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

### `scripts/register-webhooks.ts`

Automates the manual Dashboard step in Step 2, once you have real
`COMETCHAT_MGMT_KEY`/`COMETCHAT_MGMT_SECRET` from CometChat Sales. Fails fast
with a clear message if they're not set. See the file's header comment for
details (its exact endpoint paths are transcribed from docs, not
live-verified, since this project has never had Management API credentials
to test against).

### Notes

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
