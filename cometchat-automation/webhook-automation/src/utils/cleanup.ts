/**
 * Small stack-based cleanup registry — replaces the repeated
 * `let currentGuid; afterEach(() => deleteGroup(currentGuid))` pattern that
 * was duplicated across several spec files. A test registers what it created
 * as it creates it; a single shared afterEach runs everything registered,
 * in reverse order, best-effort (a cleanup failure never fails the test that
 * already passed/failed on its own merits).
 *
 * Safe as a module-level stack specifically because this suite runs tests
 * serially (playwright.config.ts: fullyParallel: false, workers: 1) — one
 * test's registrations are always fully drained before the next test starts.
 */
type CleanupFn = () => Promise<unknown> | unknown;

let stack: CleanupFn[] = [];

export function registerCleanup(fn: CleanupFn): void {
  stack.push(fn);
}

export async function runCleanups(): Promise<void> {
  while (stack.length) {
    const fn = stack.pop()!;
    try {
      await fn();
    } catch {
      // Best-effort — a cleanup failure (e.g. resource already gone) must
      // never mask the actual test result.
    }
  }
}
