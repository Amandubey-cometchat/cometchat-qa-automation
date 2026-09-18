/**
 * Trigger layer for MODERATION webhooks — see src/registry/moderation.registry.ts.
 * sendFlaggedContent/sendCleanContent are live-verified real triggers for
 * moderation_engine_blocked/approved (2026-09-06, prod-eu, Profanity filter
 * rule). moderation_manual_approved has no trigger function at all: it's a
 * Dashboard-only human action with no REST/SDK path.
 */
import { sendFlaggedMessage, sendCleanMessage } from '../../clients/moderation.client';

export const sendFlaggedContent = sendFlaggedMessage;
export const sendCleanContent = sendCleanMessage;
