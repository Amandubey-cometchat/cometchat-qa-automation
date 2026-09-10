/**
 * Generates receiver/public/trigger-categories.json from
 * src/registry/webhook.registry.ts (the single source of truth), so the
 * dashboard can group live webhook events and show per-category coverage
 * without duplicating the registry data by hand.
 *
 * The receiver is a separate, plain-JS deployed service with no access to
 * this project's TypeScript registry at runtime — this script bridges that
 * gap by producing a static asset committed alongside it. Re-run whenever
 * a webhook is added to/removed from the registry:
 *   npx tsx scripts/generate-trigger-categories.ts
 *
 * Two separate structures, deliberately not one flat map — they answer
 * different questions:
 *
 *   triggerToCategory: which category does a LIVE EVENT belong in, keyed by
 *     the real trigger name CometChat sends. Legacy shares 2 trigger names
 *     with the modern MESSAGE category (message_delivery_receipt,
 *     message_read_receipt — see legacy.registry.ts) and a raw payload has
 *     no field saying which system sent it, so this is first-write-wins:
 *     REGISTRY's category order puts MESSAGE before LEGACY, so those 2
 *     names keep grouping under Message (the far more common, automated
 *     case) for live events. This is a real, inherent limitation — not a
 *     bug — for exactly those 2 trigger names.
 *
 *   categoryTotals: how many webhooks are REGISTERED in each category,
 *     counted directly from the registry with no collision resolution.
 *     Legacy is 5 here even though only 3 of its names are uniquely
 *     identifiable in a live event — the "registered" count and the
 *     "can this live event be unambiguously attributed" question are
 *     answered separately on purpose.
 *
 *   triggerToDisplayLabel: trigger name -> the human-readable Dashboard tab
 *     name it lives under (matching dashboard.html's own DISPLAY_CATEGORIES
 *     labels, which mirror the CometChat Dashboard's real webhook trigger
 *     tabs: Group / Call & Meeting / Message / Campaign / User / Moderation
 *     / Legacy). Used by the receiver to turn a "timed out waiting for
 *     webhook X" test failure into an actionable hint — "check the
 *     Dashboard's <label> webhook trigger for X" — instead of a generic
 *     "could be disabled" message. Same CALLS+MEETINGS -> "Call & Meeting"
 *     merge as the frontend, since that's a display-only grouping choice.
 */
import fs from 'fs';
import path from 'path';
import { REGISTRY } from '../src/registry/webhook.registry';

const OUT_FILE = path.join(__dirname, '..', 'receiver', 'public', 'trigger-categories.json');

const DISPLAY_LABEL: Record<string, string> = {
  GROUP: 'Group',
  CALLS: 'Call & Meeting',
  MEETINGS: 'Call & Meeting',
  MESSAGE: 'Message',
  CAMPAIGN: 'Campaign',
  USER: 'User',
  MODERATION: 'Moderation',
  LEGACY: 'Legacy',
};

const triggerToCategory: Record<string, string> = {};
for (const entry of REGISTRY) {
  if (triggerToCategory[entry.expectedEvent] === undefined) {
    triggerToCategory[entry.expectedEvent] = entry.category;
  }
}

const categoryTotals: Record<string, number> = {};
for (const entry of REGISTRY) {
  categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + 1;
}

const triggerToDisplayLabel: Record<string, string> = {};
for (const [trigger, category] of Object.entries(triggerToCategory)) {
  triggerToDisplayLabel[trigger] = DISPLAY_LABEL[category] || category;
}

const output = { triggerToCategory, categoryTotals, triggerToDisplayLabel };
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + '\n');
console.log(
  `Wrote ${Object.keys(triggerToCategory).length} trigger->category mappings and ${Object.keys(categoryTotals).length} ` +
    `category totals (${REGISTRY.length} webhooks total) to ${path.relative(process.cwd(), OUT_FILE)}`
);
