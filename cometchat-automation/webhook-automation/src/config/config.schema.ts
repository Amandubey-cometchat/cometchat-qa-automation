/**
 * The typed shape every environment's configuration must satisfy, plus a
 * runtime validator. Values themselves always come from .env.<APP_ENV> (via
 * env.ts) — never hardcoded here. This file defines *what a valid config
 * looks like*, not what any particular environment's config *is*.
 */

export type AppEnvName = 'staging-us' | 'prod-us' | 'prod-eu' | 'prod-in';

export interface EnvironmentConfig {
  /** e.g. "staging-us", "prod-eu" — the full env identifier this project uses (region-qualified, since prod spans 3 regions) */
  appEnv: AppEnvName;
  /** "staging" | "prod" — derived from appEnv, used for policy checks (see prod.config.ts / staging.config.ts) */
  environment: 'staging' | 'prod';
  region: string;
  appId: string;
  restApiKey: string;
  webhookReceiverUrl: string;
  webhookBasicAuthUser: string;
  webhookBasicAuthPass: string;
  /** Base URL for querying the receiver directly (no /webhook path) */
  receiverQueryUrl: string;
  /** Multi-Tenancy Management API creds — only set once CometChat Sales provisions them */
  mgmtKey?: string;
  mgmtSecret?: string;
  /**
   * Dedicated-deployment host overrides (e.g. CometChat's staging
   * infrastructure, which lives on cometchat-staging.com rather than the
   * standard cometchat.io — confirmed live 2026-09-08 for staging-us).
   * Literal values as CometChat's own dashboard/UIKit snippets give them:
   * "<appId>.api-<region>.<domain>/v3" and "<appId>.apiclient-<region>.<domain>/v3"
   * — no protocol prefix. Passed straight through to the REST client's base
   * URL and to the JS SDK's AppSettingsBuilder.overrideAdminHost/
   * overrideClientHost. Unset for every standard (non-dedicated) app.
   */
  adminHost?: string;
  clientHost?: string;
}

export const REQUIRED_KEYS: (keyof EnvironmentConfig)[] = [
  'appId',
  'region',
  'restApiKey',
  'webhookReceiverUrl',
  'webhookBasicAuthUser',
  'webhookBasicAuthPass',
  'receiverQueryUrl',
];

/**
 * Fails fast with every missing field named at once (not one-at-a-time) —
 * a QA engineer fixing a fresh .env.<name> file wants the full list, not a
 * game of whack-a-mole across repeated runs.
 */
export function validateConfig(config: Partial<EnvironmentConfig>): asserts config is EnvironmentConfig {
  const missing = REQUIRED_KEYS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Invalid configuration for APP_ENV="${config.appEnv}" — missing/empty: ${missing.join(', ')}.\n` +
        `Check .env.${config.appEnv} against .env.example.`
    );
  }
}
