# moderation-automation

End-to-end tests for CometChat Moderation, driven through the UI of CometChat's
official **React sample app** (UI Kit v7) with Playwright and the Page Object
Model. Every user action (log in, send, report) happens in a real browser;
the REST API is used only to create/delete test users and to read the app's
Moderation lists.

Fully separate from `webhook-automation/` — own dependencies, config and keys.

## Run

```bash
cd moderation-automation
./run.sh staging      # or prod:eu / prod:us / prod:in (asks for confirmation)
npm run report        # open the HTML report
```

`run.sh` installs dependencies, downloads the sample app at a pinned commit
into `sample-app/` (git-ignored), and starts it on http://localhost:3005.

## Configuration

One file per app: `.env.staging-us`, `.env.prod-eu`, `.env.prod-us`,
`.env.prod-in` (see `.env.example`). Each needs the App ID, Region, a
**REST API Key** (fullAccess) and an **Auth Key** (the sample app logs in with it).

## What's tested

| Test | Pass means |
|---|---|
| Clean message | Delivered to the receiver, not in Blocked Messages |
| Profanity / phone number / email | Listed in Blocked Messages under the right rule, never shown to the receiver. Skipped when that rule is disabled in the app. |
| Report a message | Appears in Flagged Messages with the reporter, reason and remark; stays visible to both users |

Moderator review (approve/reject/block) is automated through the Moderation
REST API — the same actions as the Dashboard buttons.

### Per-app status (last run 2026-09-18)

| App | Moderation in plan | Rules on | Result |
|---|---|---|---|
| prod-eu | yes | profanity, contact, email, image, video | 5/5 pass |
| prod-us | yes | profanity, contact, email, custom `custome` | 5/5 pass |
| staging-us | **no** | none | clean passes; report fails `ERR_FEATURE_NOT_ACCESSIBLE`; blocking skipped |
| prod-in | **no** | none | clean passes; report fails `ERR_FEATURE_NOT_ACCESSIBLE`; blocking skipped |

"Moderation in plan: no" means CometChat rejects moderation calls with
*"Moderation feature is not available. To enable this feature, please upgrade
your plan."* — an account setting, not a test problem. The report test is left
failing there on purpose so the gap stays visible.

## Toggle ON/OFF matrix

`src/tests/toggles/` switches every moderation rule ON, sends content it should
block, checks it; then OFF, sends the same content, checks it goes through.
All rules are switched off first so exactly one rule is active per case, and the
app's original rule states are restored afterwards. **It changes the app's live
moderation settings while it runs.**

```bash
npm run toggles:prod:us                               # runs the matrix (≈10 min)
npm run dashboard reports/toggle-run/<runId>          # builds dashboard.html
# if a run is ever killed mid-way:
APP_ENV=prod-us CONFIRM_PROD=yes npm run restore-rules reports/toggle-run/<runId>/rules-before.json
```

### Scenario suite

`src/tests/scenarios/` covers everything beyond on/off: rule actions (flag,
block user, kick, ban, deactivate), group chats, sender filters, custom
keyword lists, moderator review (approve/reject blocked, approve/block
flagged), report reasons (incl. two reporters and a custom reason), edited
messages and rule history. Each scenario creates **its own temporary rule on a
private keyword** (and its own users/group/list/reason) and deletes it after —
the app's real rules are never touched. Leftovers from an interrupted run are
swept at the start of the next one.

```bash
npm run scenarios:prod:us                             # ≈15 min
npm run dashboard reports/scenario-run/<runId>
```

`fixtures/unsafe-revolver.mp4` (video moderation) is generated from the photo
with `npm run make:video`.

Every run first does a **preflight** (`src/preflight.ts`): starts the sample app
with the target App ID, logs a temporary user in, and stops if the app isn't on
that App ID.

## Layout

```
src/
  config/env.ts        picks the app (APP_ENV) and loads its .env
  api/                 REST: test users + Moderation lists (setup and checks only)
  pages/               page objects — one class per sample-app screen
    login.page.ts  home.page.ts  chat.page.ts  report-message.dialog.ts
  fixtures/test.ts     gives each test two fresh signed-in users: alice and bob
  tests/
    clean/  blocking/  flagging/
scripts/setup-sample-app.ts   downloads + installs the pinned sample app
```

Each test uses new users with unique IDs. Blocked and flagged records can't be
deleted via API, so each run leaves a few entries in the app's Moderation screens.
