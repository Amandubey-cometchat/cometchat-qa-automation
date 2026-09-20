/**
 * Resolves which CometChat app to test (APP_ENV) and loads .env.<APP_ENV>.
 * Production apps need CONFIRM_PROD=yes — tests create users and send real
 * messages that land in the app's Moderation screens.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export type AppEnvName = 'staging-us' | 'prod-us' | 'prod-eu' | 'prod-in';
const APP_ENVS: AppEnvName[] = ['staging-us', 'prod-us', 'prod-eu', 'prod-in'];

export interface Config {
  appEnv: AppEnvName;
  appId: string;
  region: string;
  restApiKey: string;
  authKey: string;
  adminHost?: string;
  clientHost?: string;
}

let cached: Config | undefined;

export function getConfig(): Config {
  if (cached) return cached;

  const appEnv = process.env.APP_ENV as AppEnvName | undefined;
  if (!appEnv || !APP_ENVS.includes(appEnv)) {
    throw new Error(`APP_ENV must be one of ${APP_ENVS.join(', ')} (got "${appEnv ?? ''}")`);
  }
  if (appEnv.startsWith('prod') && process.env.CONFIRM_PROD !== 'yes') {
    throw new Error(`${appEnv} is a production app — set CONFIRM_PROD=yes to run against it.`);
  }

  const file = path.resolve(__dirname, '../..', `.env.${appEnv}`);
  if (!fs.existsSync(file)) throw new Error(`Missing ${file} — copy .env.example and fill it in.`);
  const env = dotenv.parse(fs.readFileSync(file));

  const required = ['COMETCHAT_APP_ID', 'COMETCHAT_REGION', 'COMETCHAT_REST_API_KEY', 'COMETCHAT_AUTH_KEY'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) throw new Error(`.env.${appEnv} is missing: ${missing.join(', ')}`);

  cached = {
    appEnv,
    appId: env.COMETCHAT_APP_ID,
    region: env.COMETCHAT_REGION,
    restApiKey: env.COMETCHAT_REST_API_KEY,
    authKey: env.COMETCHAT_AUTH_KEY,
    adminHost: env.COMETCHAT_ADMIN_HOST || undefined,
    clientHost: env.COMETCHAT_CLIENT_HOST || undefined,
  };
  return cached;
}
