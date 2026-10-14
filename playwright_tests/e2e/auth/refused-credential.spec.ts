/**
 * Refused Credential — E2E Test Suite
 *
 * Since switchblade#1034 the server refuses an expired SAT on
 * `signalwire.connect` with -32002 and closes the socket. A session that
 * outlived its SAT keeps working until the socket drops (a server deploy, a
 * network blip); every reconnect after that presents the same expired SAT.
 */
import type { WebSocketRoute } from '@playwright/test';
import { test, expect, createSATToken } from '../fixtures';
import { gotoTestPage, initializeClient, setupErrorListener } from '../helpers/setup';

// ── Timeout constants ─────────────────────────────────────────
// Long enough for the client to connect before the SAT expires.
const SAT_TTL_S = 20;
// The server keeps accepting a SAT for RELAY__AUTHORIZATION_EXPIRATION_GRACE
// (default 60s) past its expiry.
const SERVER_EXPIRY_GRACE_MS = 60_000;
const EXPIRY_MARGIN_MS = 5_000;
const CONNECT_REPLY_TIMEOUT = 15_000;
// The looping clients reconnected about every 1.25s, so a loop shows up
// several times in this window.
const RETRY_OBSERVATION_MS = 10_000;
const OBSERVABLE_TIMEOUT = 10_000;

const AUTHENTICATION_FAILED = -32002;

interface ConnectAttempt {
  id: string;
  resume: boolean;
  accepted?: boolean;
  error?: { code: number; message: string };
}

interface RpcFrame {
  id?: string;
  method?: string;
  params?: { authorization_state?: string };
  result?: unknown;
  error?: { code: number; message: string };
}

function parseFrame(frame: string | Buffer): RpcFrame | undefined {
  try {
    return JSON.parse(String(frame)) as RpcFrame;
  } catch {
    return undefined;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test.describe('Refused Credential', () => {
  test.afterEach(async ({ page }) => {
    await page
      .evaluate(async () => {
        try {
          window.__transportErrorSub?.unsubscribe();
        } catch {
          /* ignore cleanup errors */
        }
        try {
          if (window.__swClient) await window.__swClient.disconnect();
        } catch {
          /* client may already be disconnected */
        }
      })
      .catch(() => {});
  });

  test('should stop reconnecting when the server refuses an expired SAT', async ({ page }) => {
    test.setTimeout(180_000);

    // ── SETUP ────────────────────────────────────────────────
    // Proxy the SDK's WebSocket to record every signalwire.connect and its
    // reply, and to drop the live socket the way a server restart does.
    const sockets: { ws: WebSocketRoute; server: WebSocketRoute }[] = [];
    const attempts: ConnectAttempt[] = [];

    await page.routeWebSocket(/.*/, (ws) => {
      const server = ws.connectToServer();
      sockets.push({ ws, server });

      ws.onMessage((frame) => {
        const message = parseFrame(frame);
        if (message?.method === 'signalwire.connect' && message.id) {
          attempts.push({ id: message.id, resume: Boolean(message.params?.authorization_state) });
        }
        server.send(frame);
      });
      ws.onClose(() => server.close());
      server.onMessage((frame) => {
        const message = parseFrame(frame);
        const attempt = attempts.find((a) => a.id === message?.id);
        if (attempt) {
          attempt.accepted = message?.result !== undefined;
          attempt.error = message?.error;
        }
        ws.send(frame);
      });
      server.onClose((code, reason) => ws.close({ code, reason }));
    });

    const mintedAt = Date.now();
    const token = await createSATToken({
      expire_at: Math.floor(mintedAt / 1000) + SAT_TTL_S,
    });
    expect(token, 'Setup failed: Could not create a short-lived SAT token').toBeTruthy();

    await gotoTestPage(page);
    await initializeClient(page, token);
    await setupErrorListener(page);

    expect(attempts.at(-1)?.accepted, 'Setup failed: the first connect was not accepted').toBe(true);

    // Let the SAT expire and the server's grace period run out while the
    // session stays connected.
    await sleep(mintedAt + SAT_TTL_S * 1000 + SERVER_EXPIRY_GRACE_MS + EXPIRY_MARGIN_MS - Date.now());

    // ── SETUP: The server drops the session ──────────────────
    const attemptsBeforeDrop = attempts.length;
    const live = sockets.at(-1)!;
    live.server.close();
    live.ws.close({ code: 1012, reason: 'Service Restart' });

    const reconnects = () => attempts.slice(attemptsBeforeDrop);
    const refusedFreshConnect = () =>
      reconnects().find((a) => !a.resume && a.error?.code === AUTHENTICATION_FAILED);
    await expect
      .poll(() => reconnects().some((a) => a.accepted) || refusedFreshConnect() !== undefined, {
        message: 'Setup failed: no reconnect was accepted or refused after the server dropped the socket',
        timeout: CONNECT_REPLY_TIMEOUT,
      })
      .toBe(true);
    test.skip(
      reconnects().some((a) => a.accepted),
      'This environment still accepts an expired SAT on reconnect (switchblade#1034 is not deployed)'
    );

    // ── CHECK: No connect follows the refusal ────────────────
    const socketsAtRefusal = sockets.length;
    const refusedIndex = attempts.indexOf(refusedFreshConnect()!);
    await sleep(RETRY_OBSERVATION_MS);

    expect(
      attempts.slice(refusedIndex + 1).length,
      'Unexpected result: the SDK kept sending signalwire.connect after the server refused the credential'
    ).toBe(0);
    expect(
      sockets.length,
      'Unexpected result: the SDK kept opening WebSockets after the server refused the credential'
    ).toBe(socketsAtRefusal);

    // ── CHECK: The client reports that it gave up ────────────
    const clientState = await page.evaluate(
      async ({ obsTimeout, refusalCode }) => {
        try {
          const connected = await window.__waitFor(
            window.__swClient.isConnected$,
            (c) => c === false,
            obsTimeout,
            'isConnected$ → false after the server refused the credential'
          );
          const refusal = window.__transportErrors.find(
            (e) => (e as { code?: number }).code === refusalCode
          ) as Error | undefined;
          return { success: true, connected, refusal: refusal?.message };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT, refusalCode: AUTHENTICATION_FAILED }
    );

    expect(
      clientState.success,
      `isConnected$ check threw: ${clientState.success ? '' : clientState.error}`
    ).toBe(true);
    expect(clientState.connected, 'Unexpected result: isConnected should be false').toBe(false);
    expect(
      clientState.refusal,
      'Unexpected result: errors$ should carry the server refusal (-32002)'
    ).toBeTruthy();
  });
});
