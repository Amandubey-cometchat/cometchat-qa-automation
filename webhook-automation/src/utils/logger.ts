/**
 * Structured console logging for webhook test runs — makes a CI failure
 * legible without reopening the test file: which environment, which webhook
 * was expected, what triggered it, what correlation ID was used, whether it
 * arrived, and how long it took.
 */
import { getConfig } from '../config/env';

export const logger = {
  testStart(webhookName: string) {
    const { environment } = getConfig();
    console.log(`\n[${environment.toUpperCase()}] [${webhookName}]`);
  },
  trigger(description: string, correlationId?: string) {
    console.log(`  Trigger: ${description}${correlationId ? `  |  Correlation ID: ${correlationId}` : ''}`);
  },
  waiting(webhookName: string) {
    console.log(`  Waiting for webhook "${webhookName}"...`);
  },
  received(webhookName: string, durationMs: number) {
    console.log(`  Webhook received: ${webhookName}  (${durationMs}ms)`);
  },
  validation(result: 'PASS' | 'FAIL', detail?: string) {
    console.log(`  Validation: ${result}${detail ? ` — ${detail}` : ''}`);
  },
  blocked(webhookName: string, reason: string) {
    console.log(`  [${webhookName}] BLOCKED — ${reason}`);
  },
};
