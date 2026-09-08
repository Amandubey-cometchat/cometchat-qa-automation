/**
 * Fixed test users, reused across every environment (staging-us, prod-us,
 * prod-eu, prod-in) rather than created fresh per test run — explicit
 * project decision. These are CometChat's own default Sample App demo
 * users (Andrew Joseph / George Alan), confirmed live to already exist on
 * every app here (prod-us, prod-eu, prod-in — 2026-09-08) since CometChat
 * seeds them automatically on app creation. No setup step needed in the
 * common case; `npm run setup` (scripts/setup.ts) remains as a fallback
 * for the rare app that had sample-data seeding declined.
 */
export const QA_USER_1 = 'cometchat-uid-1';
export const QA_USER_2 = 'cometchat-uid-2';
