import { sleep } from './timeout';

/**
 * Generic poll-until-condition loop: calls `check()` every `intervalMs`
 * until it returns a non-null/non-undefined value, or `timeoutMs` elapses.
 * Deliberately not used for fixed sleeps — every wait in this project polls
 * for a real condition rather than assuming a fixed delay is "enough".
 */
export async function pollUntil<T>(
  check: () => Promise<T | null | undefined>,
  { timeoutMs, intervalMs = 500 }: { timeoutMs: number; intervalMs?: number }
): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result != null) return result;
    await sleep(intervalMs);
  }
  return null;
}
