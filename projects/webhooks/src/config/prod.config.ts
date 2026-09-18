/**
 * Production-specific *policy* — never production *secrets* (those live only
 * in the gitignored .env.prod-<region> files, loaded by env.ts). This is the
 * "prod.config.ts" the target architecture calls for, adapted: since this
 * project's Production spans three regions (not one URL/App ID), the fixed
 * thing to encode here is the safety policy, not a hardcoded endpoint.
 */

export const PROD_VALID_REGIONS = ['us', 'eu', 'in'] as const;

/** Every prod-* environment requires this env var to actually run — see env.ts. */
export const PROD_CONFIRMATION_ENV_VAR = 'CONFIRM_PROD';
export const PROD_CONFIRMATION_VALUE = 'yes';

export const PROD_SAFETY_NOTICE =
  'This suite creates/deletes groups, sends messages, and bans/blocks users — ' +
  'real side effects against a real production CometChat app.';
