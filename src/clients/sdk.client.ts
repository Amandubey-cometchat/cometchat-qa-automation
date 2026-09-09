/**
 * A real, connected CometChat client — for the handful of webhooks that only
 * fire from the SDK's client-side WebSocket session (group self-join/leave,
 * delivery/read receipts, aggregate receipts, connection status), which the
 * REST API this project otherwise uses has no way to reach (verified live:
 * REST 'Add Members' with onBehalfOf set to the joining user's own UID 401s
 * with ERR_GROUP_NOT_JOINED; the REST Messages API has no mark-as-delivered/
 * read endpoint at all).
 *
 * Drives the actual CometChat JS SDK inside a real (headless) browser via
 * Playwright, loaded from the CDN CometChat's own docs point to — not a
 * mock, not a simulation. Requires an Auth Token (see createAuthToken in
 * cometchat.client.ts), not the server-side REST API key, per CometChat's
 * client-auth model. Not in the target architecture's literal file list —
 * added because this project genuinely needs it; it belongs in the client
 * layer since it's another way of reaching CometChat, alongside the REST
 * clients.
 */
import { chromium, Browser, Page } from '@playwright/test';
import { getConfig } from '../config/env';

const COMETCHAT_SDK_CDN = 'https://unpkg.com/@cometchat/chat-sdk-javascript/CometChat.js';

export interface SdkClient {
  uid: string;
  page: Page;
  joinGroup(guid: string): Promise<{ hasJoined: boolean }>;
  leaveGroup(guid: string): Promise<{ hasLeft: boolean }>;
  markAsDelivered(messageId: string | number, receiverId: string, receiverType: 'user' | 'group', senderId: string): Promise<void>;
  markAsRead(messageId: string | number, receiverId: string, receiverType: 'user' | 'group', senderId: string): Promise<void>;
  /** Places an outgoing call — no REST equivalent (the Calls REST API is read-only: List/Get call logs. Verified live 2026-09-09). `timeoutSeconds` overrides CometChat's default 45s ring timeout, e.g. for call_unanswered tests. */
  initiateCall(receiverUid: string, callType: 'audio' | 'video', timeoutSeconds?: number): Promise<{ sessionId: string }>;
  acceptCall(sessionId: string): Promise<{ sessionId: string }>;
  /** `status` is CometChat.CALL_STATUS.REJECTED ('rejected', receiver declining) or .CANCELLED ('cancelled', initiator backing out before pickup) — same underlying method, different status per CometChat's docs. */
  rejectCall(sessionId: string, status: 'rejected' | 'cancelled'): Promise<void>;
  disconnect(): Promise<void>;
  close(): Promise<void>;
}

export async function launchSdkClient(uid: string, authToken: string): Promise<SdkClient> {
  const browser: Browser = await chromium.launch();
  const page = await browser.newPage();
  // The SDK requires a real origin with localStorage available — a blank/
  // about: page has no storage backend and init() fails with
  // "No available storage method found". Verified live.
  await page.goto('https://example.com');
  await page.addScriptTag({ url: COMETCHAT_SDK_CDN });

  const { appId, region, adminHost, clientHost } = getConfig();
  await page.evaluate(
    async ({ appId, region, authToken, adminHost, clientHost }) => {
      // @ts-ignore - CometChat is a CDN global, not a module import
      const builder = new CometChat.AppSettingsBuilder().subscribePresenceForAllUsers().setRegion(region).autoEstablishSocketConnection(true);
      // Dedicated-deployment override (e.g. CometChat's staging
      // infrastructure, on cometchat-staging.com rather than cometchat.io)
      if (adminHost) builder.overrideAdminHost(adminHost);
      if (clientHost) builder.overrideClientHost(clientHost);
      const appSetting = builder.build();
      // @ts-ignore
      await CometChat.init(appId, appSetting);
      // @ts-ignore
      await CometChat.login(authToken);
    },
    { appId, region, authToken, adminHost, clientHost }
  );
  // login() resolving doesn't guarantee the WebSocket has finished opening —
  // calling an action too soon throws NO_WEBSOCKET_CONNECTION. Verified live.
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return {
    uid,
    page,
    async joinGroup(guid: string) {
      return page.evaluate(
        // @ts-ignore
        ({ guid }) => CometChat.joinGroup(guid, CometChat.GROUP_TYPE.PUBLIC, '').then((g: any) => ({ hasJoined: g.getHasJoined() })),
        { guid }
      );
    },
    async leaveGroup(guid: string) {
      // @ts-ignore
      return page.evaluate(({ guid }) => CometChat.leaveGroup(guid).then((hasLeft: boolean) => ({ hasLeft })), { guid });
    },
    async markAsDelivered(messageId, receiverId, receiverType, senderId) {
      return page.evaluate(
        // @ts-ignore
        ({ messageId, receiverId, receiverType, senderId }) => CometChat.markAsDelivered(String(messageId), receiverId, receiverType, senderId),
        { messageId, receiverId, receiverType, senderId }
      );
    },
    async markAsRead(messageId, receiverId, receiverType, senderId) {
      return page.evaluate(
        // @ts-ignore
        ({ messageId, receiverId, receiverType, senderId }) => CometChat.markAsRead(String(messageId), receiverId, receiverType, senderId),
        { messageId, receiverId, receiverType, senderId }
      );
    },
    async initiateCall(receiverUid, callType, timeoutSeconds) {
      return page.evaluate(
        ({ receiverUid, callType, timeoutSeconds }) => {
          // @ts-ignore
          const call = new CometChat.Call(receiverUid, callType === 'video' ? CometChat.CALL_TYPE.VIDEO : CometChat.CALL_TYPE.AUDIO, CometChat.RECEIVER_TYPE.USER);
          // @ts-ignore
          const promise = timeoutSeconds !== undefined ? CometChat.initiateCall(call, timeoutSeconds) : CometChat.initiateCall(call);
          return promise.then((outgoingCall: any) => ({ sessionId: outgoingCall.getSessionId() }));
        },
        { receiverUid, callType, timeoutSeconds }
      );
    },
    async acceptCall(sessionId) {
      return page.evaluate(
        // @ts-ignore
        ({ sessionId }) => CometChat.acceptCall(sessionId).then((call: any) => ({ sessionId: call.getSessionId() })),
        { sessionId }
      );
    },
    async rejectCall(sessionId, status) {
      return page.evaluate(
        ({ sessionId, status }) =>
          // @ts-ignore
          CometChat.rejectCall(sessionId, status === 'cancelled' ? CometChat.CALL_STATUS.CANCELLED : CometChat.CALL_STATUS.REJECTED).then(() => undefined),
        { sessionId, status }
      );
    },
    async disconnect() {
      // @ts-ignore
      await page.evaluate(() => CometChat.logout());
    },
    async close() {
      // Best-effort graceful logout before killing the browser — without
      // this, the WebSocket connection dies abruptly instead of closing
      // cleanly, leaving a "zombie" session CometChat doesn't immediately
      // register as disconnected. Verified live (prod-in, 2026-09-05): this
      // was making user_connection_status_changed's aggregate `data.status`
      // report "online" (another lingering session still counted as active)
      // even though the *current* connection's own action was genuinely
      // "disconnected" — a real bug in every SDK-driven test's cleanup, not
      // a CometChat quirk. Wrapped in try/catch since a test that already
      // called disconnect()/logout() itself would otherwise throw here.
      try {
        // @ts-ignore
        await page.evaluate(() => CometChat.logout());
      } catch {
        // already logged out, or the page/session is in a state where this
        // no longer matters — either way, still close the browser below.
      }
      await browser.close();
    },
  };
}
