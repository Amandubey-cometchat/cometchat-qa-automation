# CometChat Automation

Real end-to-end QA automation for CometChat. Every CometChat feature under
test is its own separate, self-contained project at the top of this repo,
named `<feature>-automation`.

```
cometchat-automation/
├── webhook-automation/          CometChat Webhooks — real events, real payloads, no mocks
├── <feature>-automation/        next feature, same pattern (e.g. moderation-automation)
├── .github/workflows/           CI (GitHub only reads workflows from the repo root)
└── render.yaml                  Render Blueprint (Render only reads it from the repo root)
```

## Projects

| Project | What it tests | Start here |
|---|---|---|
| [`webhook-automation`](webhook-automation/) | All CometChat webhook triggers across staging, prod-us, prod-eu and prod-in, plus a live receiver dashboard | [README](webhook-automation/README.md) |

## Run a project

```bash
git clone <this repo> cometchat-automation
cd cometchat-automation/webhook-automation
./run.sh        # macOS/Linux
run.bat         # Windows
```

## Adding a new feature (e.g. moderation)

Each project is fully separate — its own dependencies, config and secrets —
so one can never break another:

1. Create `moderation-automation/` at the repo root with its own
   `package.json`, `.gitignore`, `README.md`, and `run.sh`/`run.bat`.
   Copying `webhook-automation/`'s layout (`src/config`, `src/clients`,
   `src/tests`, `cli/`, …) is the fastest start.
2. Keep that project's secrets in its own `.env.*` files inside its folder.
   The repo-root `.gitignore` blocks `.env` files at any depth, so they
   can't be committed by accident.
3. Add a row to the **Projects** table above.
4. If it needs CI, add a workflow under `.github/workflows/` with
   `defaults.run.working-directory: moderation-automation`. If it deploys to
   Render, add a service to `render.yaml` with `rootDir: moderation-automation/…`.
