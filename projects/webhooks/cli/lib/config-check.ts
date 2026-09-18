/**
 * Checks whether .env.<name> files exist and satisfy config.schema.ts's
 * REQUIRED_KEYS — WITHOUT ever importing src/config/env.ts. env.ts fail-fast
 * loads config at import time (`export const config = getConfig()`, by
 * design — see its own header comment), so importing it before a .env file
 * exists would crash before the wizard ever gets a chance to run. dotenv's
 * parse() reads a file into a plain object without touching process.env,
 * which lets this check run safely at menu-build time, before any
 * environment has necessarily been configured yet.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { REQUIRED_KEYS } from '../../src/config/config.schema';

const REPO_ROOT = path.join(__dirname, '..', '..');

// Mirrors src/config/env.ts's private KNOWN_ENVS. Kept separate rather than
// imported for the reason above — see cli/index.ts's own copy of this note.
export const APP_ENVS = ['staging-us', 'prod-us', 'prod-eu', 'prod-in'] as const;
export type AppEnvName = (typeof APP_ENVS)[number];

const FIELD_TO_ENV_VAR: Record<string, string> = {
  appId: 'COMETCHAT_APP_ID',
  region: 'COMETCHAT_REGION',
  restApiKey: 'COMETCHAT_REST_API_KEY',
  webhookReceiverUrl: 'WEBHOOK_RECEIVER_URL',
  webhookBasicAuthUser: 'WEBHOOK_BASIC_AUTH_USER',
  webhookBasicAuthPass: 'WEBHOOK_BASIC_AUTH_PASS',
  receiverQueryUrl: 'RECEIVER_QUERY_URL',
};

export interface ConfigStatus {
  env: AppEnvName;
  exists: boolean;
  valid: boolean;
  missing: string[];
}

export function envFilePath(env: AppEnvName): string {
  return path.join(REPO_ROOT, `.env.${env}`);
}

export function checkConfig(env: AppEnvName): ConfigStatus {
  const filePath = envFilePath(env);
  if (!fs.existsSync(filePath)) {
    return { env, exists: false, valid: false, missing: REQUIRED_KEYS.map((k) => FIELD_TO_ENV_VAR[k] || k) };
  }
  const parsed = dotenv.parse(fs.readFileSync(filePath));
  const missing = REQUIRED_KEYS.filter((key) => !parsed[FIELD_TO_ENV_VAR[key]]).map((key) => FIELD_TO_ENV_VAR[key] || key);
  return { env, exists: true, valid: missing.length === 0, missing };
}

export function checkAllConfigs(): ConfigStatus[] {
  return APP_ENVS.map(checkConfig);
}
