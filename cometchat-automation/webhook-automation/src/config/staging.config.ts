/**
 * Staging-specific policy — the counterpart to prod.config.ts. Staging has a
 * single region (us) and needs no confirmation gate to run against, since it
 * isn't expected to carry real production traffic.
 */

export const STAGING_VALID_REGIONS = ['us'] as const;
export const STAGING_REQUIRES_CONFIRMATION = false;
