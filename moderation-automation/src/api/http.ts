/**
 * fetch with retries on network-level failures ("fetch failed", resets,
 * DNS blips). HTTP error statuses are returned as-is — only a request that
 * never got a response is retried, so a real API error is never masked.
 */
export async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      lastError = e;
      if (i < attempts) await new Promise((r) => setTimeout(r, 2_000 * i));
    }
  }
  throw lastError;
}
