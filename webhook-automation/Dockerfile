# Optional/advanced execution path — NOT required for local use. See README
# "CI/CD" section. Runs the test suite itself; the receiver is normally the
# already-deployed Render instance (see README "Receiver hosting"), not this
# image. A separate `receiver/Dockerfile`-less local run is still possible
# via `cd receiver && npm start` if you need one.
FROM node:20-slim

# Playwright's own dependency list for a headless Chromium on Debian slim.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Installs chromium + its OS-level deps in one step — the only browser this
# project ever launches (src/clients/sdk.client.ts).
RUN npx playwright install --with-deps chromium

COPY . .

ENV APP_ENV=staging-us

# Default: run the full staging suite. Override at `docker run`/compose
# time, e.g. `docker compose run tests npm run webhook -- group staging`.
CMD ["npm", "run", "test:staging"]
