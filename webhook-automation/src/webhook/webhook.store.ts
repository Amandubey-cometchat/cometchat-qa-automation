/**
 * Client-side interface to the receiver's event store (the actual HTTP
 * listener that CometChat delivers to is receiver/index.js — a small Express
 * service deployed separately on Render; this project's src/tests never run
 * a listener themselves, they query the deployed one over HTTP). This module
 * is the lowest layer: raw fetch/reset calls, no polling or matching logic —
 * see webhook.waiter.ts for that.
 */
import { getConfig } from '../config/env';

export interface StoredWebhookEvent {
  id: string;
  trigger: string;
  receivedAt: number;
  method: string;
  headers: Record<string, string | null>;
  payload: any;
}

function receiverUrl(path: string): string {
  return `${getConfig().receiverQueryUrl}${path}`;
}

/** Clears the receiver's per-test event store — call at the start of every test for isolation. */
export async function resetEvents(): Promise<void> {
  await fetch(receiverUrl('/webhook/events'), { method: 'DELETE' });
}

/** Everything currently in the (per-test) store, optionally filtered by trigger. */
export async function fetchEvents(trigger?: string): Promise<StoredWebhookEvent[]> {
  const qs = trigger ? `?trigger=${encodeURIComponent(trigger)}` : '';
  const res = await fetch(receiverUrl(`/webhook/events${qs}`));
  const json = await res.json();
  return json.events;
}
