/**
 * Downloads CometChat's official React sample app (UI Kit v7) into
 * ./sample-app at a pinned commit and installs its dependencies. Pinned so
 * an upstream UI change can never silently break these tests — bump
 * SAMPLE_APP_COMMIT deliberately and re-run to upgrade.
 *
 * Source: https://github.com/cometchat/cometchat-uikit-react/tree/v7/sample-app
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SAMPLE_APP_COMMIT = 'a9fb497cbd73382aa6582bcdf4acef2c772988da';
const REPO = 'cometchat/cometchat-uikit-react';
// Bump when PATCHES change so existing checkouts get re-patched.
const PATCH_VERSION = '1';

/**
 * Our only change to upstream code: the sample app has no way to set
 * dedicated-deployment hosts (staging-us lives on cometchat-staging.com).
 * This reads optional adminHost/clientHost from localStorage, seeded by
 * LoginPage. The UI Kit ignores empty values, so standard apps are unaffected.
 */
const PATCHES = [
  {
    file: 'src/App.tsx',
    find: '      .setAuthKey(authKey)\n',
    replace:
      '      .setAuthKey(authKey)\n' +
      "      .setAdminHost(localStorage.getItem('adminHost') ?? '') // moderation-automation patch\n" +
      "      .setClientHost(localStorage.getItem('clientHost') ?? '') // moderation-automation patch\n",
  },
];

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'sample-app');
const marker = path.join(target, '.pinned-commit');
const version = `${SAMPLE_APP_COMMIT}+patch${PATCH_VERSION}`;

if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === version) {
  console.log(`sample-app already at ${SAMPLE_APP_COMMIT.slice(0, 7)} (patch ${PATCH_VERSION}) — nothing to do.`);
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-sample-app-'));
const tarball = path.join(tmp, 'src.tar.gz');
console.log(`Downloading ${REPO}@${SAMPLE_APP_COMMIT.slice(0, 7)}...`);
execSync(`curl -fsSL -o "${tarball}" https://codeload.github.com/${REPO}/tar.gz/${SAMPLE_APP_COMMIT}`, { stdio: 'inherit' });
execSync(`tar -xzf "${tarball}" -C "${tmp}"`);

const extracted = path.join(tmp, `cometchat-uikit-react-${SAMPLE_APP_COMMIT}`, 'sample-app');
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(extracted, target, { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });

for (const p of PATCHES) {
  const file = path.join(target, p.file);
  const src = fs.readFileSync(file, 'utf8');
  if (src.split(p.find).length !== 2) {
    throw new Error(`Patch anchor not found exactly once in ${p.file} — upstream changed; update PATCHES.`);
  }
  fs.writeFileSync(file, src.replace(p.find, p.replace));
}

console.log('Installing sample-app dependencies...');
execSync('npm install --no-audit --no-fund', { cwd: target, stdio: 'inherit' });

fs.writeFileSync(marker, version);
console.log('sample-app ready.');
