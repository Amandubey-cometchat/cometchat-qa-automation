# CometChat QA Automation

Real end-to-end QA automation for CometChat, organized so each product area
under test is its own self-contained project.

```
.
├── projects/
│   └── webhooks/          CometChat Webhooks — real events, real payloads, no mocks
├── .github/workflows/     CI (GitHub only reads workflows from the repo root)
└── render.yaml            Render Blueprint (Render only reads it from the repo root)
```

## Projects

| Project | What it tests | Start here |
|---|---|---|
| [`webhooks`](projects/webhooks/) | All CometChat webhook triggers across staging, prod-us, prod-eu and prod-in, plus a live receiver dashboard | [projects/webhooks/README.md](projects/webhooks/README.md) |

## Run a project

```bash
cd projects/webhooks
./run.sh        # macOS/Linux
run.bat         # Windows
```

## Adding a new project

Each project is fully self-contained, so one can never break another:

1. Create `projects/<name>/` with its own `package.json`, `.gitignore`,
   `README.md`, and `run.sh`/`run.bat`. Copying `projects/webhooks/`'s
   layout (`src/config`, `src/clients`, `src/tests`, …) is the fastest start.
2. Keep that project's secrets in its own `projects/<name>/.env.*` files.
   The repo-root `.gitignore` blocks `.env` files at any depth, so they can't
   be committed by accident.
3. Add a row to the **Projects** table above.
4. If it needs CI, add a workflow under `.github/workflows/` with
   `defaults.run.working-directory: projects/<name>`. If it deploys to
   Render, add a service to `render.yaml` with `rootDir: projects/<name>/…`.
