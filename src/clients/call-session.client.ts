/**
 * A real, connected CometChat call SESSION — for the 5 Calls webhooks that
 * only fire once a call is actually joined (call_started, call_participant_
 * joined/left, call_ended, call_busy), not just rung/accepted/rejected (see
 * sdk.client.ts's initiateCall/acceptCall/rejectCall for that signaling-only
 * half). Confirmed live 2026-09-09: accepting a call without joining its
 * media session neither starts it nor makes the receiver "busy".
 *
 * Requires the separate @cometchat/calls-sdk-javascript package (the Chat
 * SDK's own call signaling has no media/WebRTC capability) loaded via CDN,
 * alongside the Chat SDK for acceptCall/endCall. Real WebRTC needs a camera/
 * mic — Chromium is launched with fake-device flags so this runs headless
 * with no real hardware, the standard, officially-supported way to test
 * WebRTC (not a mock of CometChat's behavior — the media stream is fake,
 * the call session and webhook delivery are real).
 *
 * API surface confirmed live against the actual package
 * (@cometchat/calls-sdk-javascript@5.0.5's own .d.ts) 2026-09-09 —
 * CallSettingsBuilder/OngoingCallListener/startSession/endSession are all
 * @deprecated in this version; joinSession + addEventListener + leaveSession
 * are current.
 */
import { chromium, Browser, Page } from '@playwright/test';
import { getConfig } from '../config/env';

const COMETCHAT_CHAT_SDK_CDN = 'https://unpkg.com/@cometchat/chat-sdk-javascript/CometChat.js';
const COMETCHAT_CALLS_SDK_CDN = 'https://unpkg.com/@cometchat/calls-sdk-javascript@5.0.5/dist/index.umd.js';

export interface CallSessionClient {
  uid: string;
  page: Page;
  /** Chat SDK signaling accept — must happen before joinCallSession. */
  acceptCall(sessionId: string): Promise<void>;
  /** Generates a call token and joins the real (fake-media) WebRTC session — this is what actually fires call_started/call_participant_joined. */
  joinCallSession(sessionId: string): Promise<void>;
  /** Leaves the media session (CometChatCalls) without ending the call for other participants — fires call_participant_left. */
  leaveCallSession(): Promise<void>;
  /** Chat SDK signaling end — the last participant leaving triggers call_ended. */
  endCall(sessionId: string): Promise<void>;
  /**
   * Rejects a DIFFERENT incoming call — status 'busy' is what fires
   * call_busy, and only means something when this session is already the
   * receiver of an active call elsewhere. Confirmed live 2026-09-09:
   * call_busy is not automatic — CometChat lets a second call ring normally
   * unless the receiving client explicitly rejects it as busy itself
   * (mirrors how a real app would detect CometChat.getActiveCall() != null
   * and reject accordingly).
   */
  rejectCall(sessionId: string, status: 'rejected' | 'cancelled' | 'busy'): Promise<void>;
  close(): Promise<void>;
}

export async function launchCallSessionClient(uid: string, authToken: string): Promise<CallSessionClient> {
  const browser: Browser = await chromium.launch({
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await context.newPage();
  await page.goto('https://example.com');
  // @cometchat/calls-sdk-javascript's UMD bundle references Node's `process`
  // global (a webpack artifact) and throws before setting window.CometChatCalls
  // without this — verified live 2026-09-09.
  await page.evaluate(() => {
    // @ts-ignore
    window.process = { env: {} };
  });
  await page.addScriptTag({ url: COMETCHAT_CHAT_SDK_CDN });
  await page.addScriptTag({ url: COMETCHAT_CALLS_SDK_CDN });

  const { appId, region } = getConfig();
  await page.evaluate(
    async ({ appId, region, authToken }) => {
      // @ts-ignore - CometChat/CometChatCalls are CDN globals, not module imports
      const appSetting = new CometChat.AppSettingsBuilder().subscribePresenceForAllUsers().setRegion(region).autoEstablishSocketConnection(true).build();
      // @ts-ignore
      await CometChat.init(appId, appSetting);
      // @ts-ignore
      await CometChat.login(authToken);
      // @ts-ignore
      await CometChatCalls.init({ appId, region });
      // @ts-ignore
      await CometChatCalls.loginWithAuthToken(authToken);

      // joinSession() needs a real DOM container to render the call UI into.
      const container = document.createElement('div');
      container.id = 'call-container';
      container.style.width = '640px';
      container.style.height = '480px';
      document.body.appendChild(container);
    },
    { appId, region, authToken }
  );
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return {
    uid,
    page,
    async acceptCall(sessionId: string) {
      await page.evaluate(
        // @ts-ignore
        ({ sessionId }) => CometChat.acceptCall(sessionId).then(() => undefined),
        { sessionId }
      );
    },
    async rejectCall(sessionId: string, status: 'rejected' | 'cancelled' | 'busy') {
      await page.evaluate(
        ({ sessionId, status }) => {
          // @ts-ignore
          const s = CometChat.CALL_STATUS[status.toUpperCase()];
          // @ts-ignore
          return CometChat.rejectCall(sessionId, s).then(() => undefined);
        },
        { sessionId, status }
      );
    },
    async joinCallSession(sessionId: string) {
      const result = await page.evaluate(
        async ({ sessionId }) => {
          // @ts-ignore
          const { token } = await CometChatCalls.generateToken(sessionId);
          // @ts-ignore
          const container = document.getElementById('call-container');
          // @ts-ignore
          return CometChatCalls.joinSession(token, { sessionType: 'VIDEO', layout: 'TILE' }, container);
        },
        { sessionId }
      );
      if (result?.error) throw new Error(`joinSession failed: ${JSON.stringify(result.error)}`);
    },
    async leaveCallSession() {
      // @ts-ignore
      await page.evaluate(() => CometChatCalls.leaveSession());
    },
    async endCall(sessionId: string) {
      await page.evaluate(
        // @ts-ignore
        ({ sessionId }) => CometChat.endCall(sessionId).then(() => undefined),
        { sessionId }
      );
    },
    async close() {
      try {
        // @ts-ignore
        await page.evaluate(() => CometChatCalls.leaveSession());
      } catch {
        // already left, or session never joined — either way, still close below.
      }
      try {
        // @ts-ignore
        await page.evaluate(() => CometChat.logout());
      } catch {
        // already logged out.
      }
      await browser.close();
    },
  };
}
