/**
 * The correlation identifiers this project's webhooks are ever matched on.
 * A thin, typed vocabulary layer on top of webhook.matcher.ts's factories —
 * exists so trigger/test code names *what kind* of ID it's correlating on,
 * rather than only how the match function is built.
 */
export type CorrelationKind = 'messageId' | 'groupId' | 'userId' | 'callId' | 'meetingId' | 'campaignId';

export interface CorrelationKey {
  kind: CorrelationKind;
  value: string;
}

export function messageId(value: string | number): CorrelationKey {
  return { kind: 'messageId', value: String(value) };
}

export function groupId(guid: string): CorrelationKey {
  return { kind: 'groupId', value: guid };
}

export function userId(uid: string): CorrelationKey {
  return { kind: 'userId', value: uid };
}

// callId / meetingId / campaignId intentionally have no real usage yet —
// Calls, Meetings, and Campaign triggers are all BLOCKED (see
// src/registry/{calls,meetings,campaign}.registry.ts). Declared here so the
// vocabulary is complete and ready the moment those become available,
// without needing to revisit this file.
export function callId(id: string): CorrelationKey {
  return { kind: 'callId', value: id };
}

export function meetingId(id: string): CorrelationKey {
  return { kind: 'meetingId', value: id };
}

export function campaignId(id: string): CorrelationKey {
  return { kind: 'campaignId', value: id };
}
