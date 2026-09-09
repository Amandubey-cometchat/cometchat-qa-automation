/**
 * Meetings needs the actual WebRTC call/meeting session (mode: 'meet' on
 * the Calls REST API — same underlying mechanism Calls uses, see
 * src/triggers/calls/calls.triggers.ts for the signaling-only half of that
 * which is now automated), not just Chat SDK signaling. No integration
 * exists here yet — see src/registry/meetings.registry.ts for the full
 * per-webhook BLOCKED reasoning.
 */

export class MeetingsClientNotImplementedError extends Error {
  constructor(action: string) {
    super(
      `meetings.client.ts: "${action}" is not implemented — no Calls & Meeting SDK integration exists in ` +
        'this project. See src/registry/meetings.registry.ts for the full per-webhook BLOCKED reasoning.'
    );
  }
}

export async function startMeeting(..._args: unknown[]): Promise<never> {
  throw new MeetingsClientNotImplementedError('startMeeting');
}

export async function joinMeeting(..._args: unknown[]): Promise<never> {
  throw new MeetingsClientNotImplementedError('joinMeeting');
}

export async function endMeeting(..._args: unknown[]): Promise<never> {
  throw new MeetingsClientNotImplementedError('endMeeting');
}
