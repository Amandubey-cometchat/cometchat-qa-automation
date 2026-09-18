#!/usr/bin/env bash
# Dependency-free bootstrap for macOS/Linux: checks Node, installs deps and
# the Playwright browser only when actually needed, then hands off to the
# real CLI (cli/index.ts). All setup/menu/test logic lives in cli/ — this
# script does nothing except get you to the point where `npx tsx` can run.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

MIN_NODE_MAJOR=18
INSTALL_STAMP="node_modules/.install-stamp"

fail() {
  echo ""
  echo "✗ $1"
  echo ""
  exit 1
}

echo "Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js not found. Install Node.js ${MIN_NODE_MAJOR}+ from https://nodejs.org and re-run ./run.sh"
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
  fail "Node.js ${MIN_NODE_MAJOR}+ required, found $(node -v). Upgrade from https://nodejs.org and re-run ./run.sh"
fi
echo "✓ Node.js $(node -v) found"

echo ""
echo "Checking dependencies..."
if [ ! -d node_modules ] || [ ! -f "$INSTALL_STAMP" ] || [ package-lock.json -nt "$INSTALL_STAMP" ]; then
  echo "Installing dependencies..."
  npm install
  touch "$INSTALL_STAMP"
  echo "✓ Dependencies installed"
else
  echo "✓ Dependencies already installed"
fi

echo ""
echo "Checking Playwright browser (chromium)..."
# playwright install is itself idempotent — it no-ops quickly when the
# requested browser is already present, so it's safe/cheap to always call
# rather than hand-rolling a separate detection step. Only chromium is ever
# launched by this project (src/clients/sdk.client.ts) — no other browser
# is needed.
npx playwright install chromium || fail "Could not install the Playwright browser. See the output above."
echo "✓ Browser ready"

echo ""
exec npx tsx cli/index.ts "$@"
