#!/usr/bin/env bash
# Usage: ./run.sh staging | prod:eu | prod:us | prod:in   [extra playwright args]
set -euo pipefail
cd "$(dirname "$0")"

case "${1:-}" in
  staging) export APP_ENV=staging-us ;;
  prod:eu) export APP_ENV=prod-eu ;;
  prod:us) export APP_ENV=prod-us ;;
  prod:in) export APP_ENV=prod-in ;;
  *) echo "Usage: ./run.sh staging|prod:eu|prod:us|prod:in [playwright args]"; exit 1 ;;
esac
shift

if [[ "$APP_ENV" == prod-* && "${CONFIRM_PROD:-}" != "yes" ]]; then
  read -r -p "Run moderation tests against production app $APP_ENV? Type yes: " answer
  [[ "$answer" == "yes" ]] || { echo "Cancelled."; exit 1; }
  export CONFIRM_PROD=yes
fi

[[ -d node_modules ]] || npm install --no-audit --no-fund
npx tsx scripts/setup-sample-app.ts
npx playwright install chromium >/dev/null
npx playwright test "$@"
