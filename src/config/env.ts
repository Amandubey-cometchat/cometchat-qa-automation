/**
 * Central environment manager. Every entry point (test specs via clients,
 * scripts, playwright.config.ts) goes through this — never a bare
 * `dotenv.config()` — so environment selection is consistent everywhere and
 * a wrong/unconfirmed target is refused before a single test runs.
 *
 * Naming note: this project uses APP_ENV (not the doc's TEST_ENV), because
 * Production alone spans three regions here (prod-us / prod-eu / prod-in) —
 * a bare "prod" isn't specific enough to load real config from. Adapted per
 * the source requirement's own "adapt this to the actual project" allowance.
 * `environment` (staging|prod) is still derived and exposed below for any
 * code that only cares about the coarse distinction.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { EnvironmentConfig, AppEnvName, validateConfig } from './config.schema';
import { PROD_VALID_REGIONS, PROD_CONFIRMATION_ENV_VAR, PROD_CONFIRMATION_VALUE, PROD_SAFETY_NOTICE } from './prod.config';
import { STAGING_VALID_REGIONS } from './staging.config';

const REPO_ROOT = path.join(__dirname, '..', '..');
const KNOWN_ENVS: AppEnvName[] = ['staging-us', 'prod-us', 'prod-eu', 'prod-in'];

function resolveAppEnv(): AppEnvName {
  const requested = (process.env.APP_ENV || 'staging-us') as AppEnvName;
  if (!KNOWN_ENVS.includes(requested)) {
    throw new Error(`Unknown APP_ENV "${requested}". Expected one of: ${KNOWN_ENVS.join(', ')}`);
  }
  return requested;
}

function enforceProdSafety(appEnv: AppEnvName) {
  if (!appEnv.startsWith('prod')) return;
  if (process.env[PROD_CONFIRMATION_ENV_VAR] !== PROD_CONFIRMATION_VALUE) {
    throw new Error(
      `Refusing to run against "${appEnv}" without ${PROD_CONFIRMATION_ENV_VAR}=${PROD_CONFIRMATION_VALUE}.\n` +
        `${PROD_SAFETY_NOTICE}\n` +
        `Re-run with: ${PROD_CONFIRMATION_ENV_VAR}=${PROD_CONFIRMATION_VALUE} APP_ENV=${appEnv} <command>`
    );
  }
}

function loadDotenvFile(appEnv: AppEnvName) {
  const envFile = path.join(REPO_ROOT, `.env.${appEnv}`);
  if (!fs.existsSync(envFile)) {
    throw new Error(`No env file for APP_ENV="${appEnv}" — expected ${envFile}. See .env.example.`);
  }
  dotenv.config({ path: envFile });
}

function buildConfig(appEnv: AppEnvName): EnvironmentConfig {
  const environment: 'staging' | 'prod' = appEnv.startsWith('prod') ? 'prod' : 'staging';
  const config: Partial<EnvironmentConfig> = {
    appEnv,
    environment,
    region: process.env.COMETCHAT_REGION,
    appId: process.env.COMETCHAT_APP_ID,
    restApiKey: process.env.COMETCHAT_REST_API_KEY,
    webhookReceiverUrl: process.env.WEBHOOK_RECEIVER_URL,
    webhookBasicAuthUser: process.env.WEBHOOK_BASIC_AUTH_USER,
    webhookBasicAuthPass: process.env.WEBHOOK_BASIC_AUTH_PASS,
    receiverQueryUrl: process.env.RECEIVER_QUERY_URL,
    mgmtKey: process.env.COMETCHAT_MGMT_KEY,
    mgmtSecret: process.env.COMETCHAT_MGMT_SECRET,
    authKey: process.env.COMETCHAT_AUTH_KEY,
    adminHost: process.env.COMETCHAT_ADMIN_HOST,
    clientHost: process.env.COMETCHAT_CLIENT_HOST,
  };
  validateConfig(config);

  const validRegions = environment === 'prod' ? PROD_VALID_REGIONS : STAGING_VALID_REGIONS;
  if (!(validRegions as readonly string[]).includes(config.region)) {
    throw new Error(
      `Config inconsistency: APP_ENV="${appEnv}" loaded region "${config.region}", but valid regions for ` +
        `${environment} are [${validRegions.join(', ')}]. Check .env.${appEnv}.`
    );
  }

  return config;
}

function printBanner(config: EnvironmentConfig) {
  const line = '='.repeat(40);
  console.log(line);
  console.log('COMETCHAT WEBHOOK AUTOMATION');
  console.log(`Environment: ${config.environment.toUpperCase()}`);
  console.log(`APP_ENV: ${config.appEnv}  |  App: ${config.appId}  |  Region: ${config.region}`);
  console.log(line);
}

let cached: EnvironmentConfig | null = null;

/** Resolves APP_ENV, enforces the prod-confirmation gate, loads .env.<APP_ENV>, validates, and prints the banner — exactly once per process, then returns the cached config on subsequent calls. */
export function getConfig(): EnvironmentConfig {
  if (cached) return cached;
  const appEnv = resolveAppEnv();
  enforceProdSafety(appEnv);
  loadDotenvFile(appEnv);
  const config = buildConfig(appEnv);
  printBanner(config);
  cached = config;
  return config;
}

// Fail fast at import time, matching this project's established behavior
// (env.js did the same) — a misconfigured environment should never let a
// single test file even finish loading.
export const config = getConfig();
