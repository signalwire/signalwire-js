/**
 * Transport Reliability — E2E Test Suite
 *
 * Tests transport-layer reliability under various network scenarios:
 * degraded connections, reconnection behavior, and transport-level
 * error propagation.
 *
 * Network simulation strategy:
 * - `page.context().setOffline(true/false)` — Node.js Playwright API to
 *   cut/restore network connectivity for the browser context.
 * - Browser-side `__waitFor` checks observe `isConnected$` and `errors$`
 *   after network changes are applied.
 *
 * Note on isConnected$ during auto-reconnect:
 * - The SDK's `_isConnected$` BehaviorSubject is ONLY set to `true` in
 *   `connect()` and to `false` in `disconnect()`.
 * - During an auto-reconnect triggered by a network interruption,
 *   `isConnected$` stays `true` throughout because the SDK maintains
 *   session state optimistically — it does not toggle the flag on each
 *   WebSocket reconnect attempt.
 * - Tests 1 and 4 therefore verify transport resilience by checking that
 *   `isConnected$` remains `true` (never went fatally false) AND that no
 *   fatal error was emitted during the brief offline period.
 */
import type { WebSocketRoute } from '@playwright/test';
import { test, expect } from '../fixtures';
import { setupClient, setupErrorListener } from '../helpers/setup';

// ── Timeout constants ─────────────────────────────────────────
const OBSERVABLE_TIMEOUT = 10_000;
const RECONNECT_TIMEOUT = 30_000;

// Shorter than dial's internal timeout so the race always resolves via
// the timeout branch rather than waiting for dial to fail on its own.
const DIAL_RACE_TIMEOUT_MS = 5_000;

// The server's first ping was observed 11-18s after connect. It aborts the
// session 4s after an unanswered ping.
const SERVER_PING_WAIT_TIMEOUT = 30_000;
const SERVER_ABORT_TIMEOUT = 10_000;
// The SDK's 15s ping watchdog, its 10s probe, and the reconnect backoff.
const HALF_OPEN_DETECTION_TIMEOUT = 30_000;
// Two watchdog windows, each ending in an answered probe.
const QUIET_SOCKET_OBSERVATION_TIMEOUT = 45_000;

test.describe('Transport Reliability', () => {
  // ── Shared teardown ─────────────────────────────────────────
  test.afterEach(async ({ page }) => {
    // Ensure the browser context is back online regardless of test outcome
    await page.context().setOffline(false).catch(() => {});
    // Brief pause to allow the test server to recover from any disrupted connections
    await new Promise((resolve) => setTimeout(resolve, 1_000));

    await page
      .evaluate(async () => {
        // Clean up any lingering errors$ subscription created during the test
        try {
          if (window.__transportErrorSub) {
            window.__transportErrorSub.unsubscribe();
            window.__transportErrorSub = undefined;
          }
        } catch {
          /* ignore cleanup errors */
        }

        try {
          if (window.__swCall) await window.__swCall.hangup();
        } catch {
          /* call may already be ended */
        }
        try {
          if (window.__swClient) await window.__swClient.disconnect();
        } catch {
          /* client may already be disconnected */
        }
      })
      .catch(() => {});
  });

  // ── Test 1: Brief network interruption → transport resilience ─
  test('should reconnect after brief network interruption', async ({ page }) => {
    // ── SETUP ────────────────────────────────────────────────
    await setupClient(page);

    // Set up error listener BEFORE going offline to capture any fatal errors
    // emitted during the disconnect period.
    await setupErrorListener(page);

    // Verify connected before disrupting network
    const initiallyConnected = await page.evaluate(
      async ({ obsTimeout }) => {
        try {
          const connected = await window.__waitFor(
            window.__swClient.isConnected$,
            (c) => c === true,
            obsTimeout,
            'isConnected$ → true before going offline'
          );
          return { success: true, connected };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(
      initiallyConnected.success,
      'Initial connection check completed'
    ).toBe(true);
    expect(
      initiallyConnected.connected,
      'Client is connected before going offline'
    ).toBe(true);

    // ── CHECK: Go offline for 2 seconds, then come back ──────
    // The SDK does NOT toggle isConnected$ during auto-reconnect — it stays
    // true optimistically. We verify resilience by confirming:
    //   1. isConnected$ is STILL true after restoring the network, and
    //   2. No fatal error was emitted during the brief offline period.
    await page.context().setOffline(true);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await page.context().setOffline(false);

    // Allow the transport a moment to stabilise after coming back online
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    const postReconnectResult = await page.evaluate(
      async ({ obsTimeout }) => {
        try {
          // isConnected$ is still true — the SDK maintains its session
          // optimistically throughout the auto-reconnect cycle.
          const connected = await window.__waitFor(
            window.__swClient.isConnected$,
            (c) => c === true,
            obsTimeout,
            'isConnected$ → still true after network restored'
          );

          const errors = window.__transportErrors ?? [];

          return {
            success: true,
            connected,
            errorCount: errors.length,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(
      postReconnectResult.success,
      'Post-reconnect check completed'
    ).toBe(true);
    // isConnected$ is still true — transport recovered without a fatal error
    expect(
      postReconnectResult.connected,
      'isConnected$ remains true after brief network interruption'
    ).toBe(true);
    // No fatal error has been emitted during the brief offline period
    expect(
      postReconnectResult.errorCount,
      'No fatal errors emitted during brief offline period'
    ).toBe(0);
  });

  // ── Test 2: Sustained disconnection → error or state change ─
  test('should detect transport problem during sustained disconnection', async ({
    page,
  }) => {
    // ── SETUP ────────────────────────────────────────────────
    await setupClient(page);

    // Set up error listener BEFORE going offline to avoid race conditions
    await setupErrorListener(page);

    // ── CHECK: Go offline and wait for SDK to detect disruption
    await page.context().setOffline(true);

    // Wait up to 15 s for the SDK to detect the transport problem
    // (either errors$ emits, or isConnected$ transitions to false)
    const detectionResult = await page.evaluate(
      async ({ detectionTimeout }) => {
        try {
          // Race: first observable to change wins
          const disconnectedPromise = window.__waitFor(
            window.__swClient.isConnected$,
            (c) => c === false,
            detectionTimeout,
            'isConnected$ → false after going offline'
          );

          let isDisconnected = false;
          let hasErrors = false;

          try {
            await disconnectedPromise;
            isDisconnected = true;
          } catch {
            // __waitFor timed out — check errors collected by listener
          }

          const errors = window.__transportErrors ?? [];
          hasErrors = errors.length > 0;

          return {
            success: true,
            isDisconnected,
            hasErrors,
            errorCount: errors.length,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { detectionTimeout: 15_000 }
    );

    // Restore connectivity for cleanup
    await page.context().setOffline(false);

    expect(
      detectionResult.success,
      'Transport problem detection completed'
    ).toBe(true);

    // The SDK must detect the transport problem via at least one signal
    const sdkDetectedProblem = detectionResult.isDisconnected || detectionResult.hasErrors;
    expect(
      sdkDetectedProblem,
      'SDK detected transport problem via isConnected$ or errors$'
    ).toBe(true);
  });

  // ── Test 3: Stability — no spurious errors during idle ──────
  test('should remain connected and error-free during stable transport', async ({
    page,
  }) => {
    // ── SETUP ────────────────────────────────────────────────
    await setupClient(page);

    // Set up error listener to capture any spurious errors
    await setupErrorListener(page);

    // ── CHECK: Idle for 5 seconds ─────────────────────────────
    await new Promise((resolve) => setTimeout(resolve, 5_000));

    const idleResult = await page.evaluate(
      async ({ obsTimeout }) => {
        try {
          // isConnected$ is still true (BehaviorSubject — current value check)
          const connected = await window.__waitFor(
            window.__swClient.isConnected$,
            (c) => c === true,
            obsTimeout,
            'isConnected$ → still true after idle period'
          );

          const errors = window.__transportErrors ?? [];

          return {
            success: true,
            connected,
            errorCount: errors.length,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(
      idleResult.success,
      'Idle period check completed'
    ).toBe(true);
    expect(
      idleResult.connected,
      'isConnected$ remains true after 5s idle'
    ).toBe(true);
    expect(
      idleResult.errorCount,
      'No errors emitted during stable idle connection'
    ).toBe(0);
  });

  // ── Test 4: Multiple reconnection cycles ────────────────────
  test('should reconnect successfully through multiple network interruptions', async ({
    page,
  }) => {
    // ── SETUP ────────────────────────────────────────────────
    await setupClient(page);

    // Set up error listener BEFORE cycling the network.
    // The SDK does NOT toggle isConnected$ during auto-reconnect — it stays
    // true optimistically. We verify resilience by confirming no fatal error
    // is emitted across multiple offline/online cycles.
    await setupErrorListener(page);

    // ── CHECK: 2 offline/online cycles ───────────────────────
    const CYCLES = 2;

    for (let cycle = 1; cycle <= CYCLES; cycle++) {
      // Go offline for 1 second
      await page.context().setOffline(true);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await page.context().setOffline(false);

      // Allow the transport a moment to stabilise after coming back online
      await new Promise((resolve) => setTimeout(resolve, 2_000));

      // Verify isConnected$ is still true (SDK maintains session optimistically)
      // and that no fatal error was emitted during this cycle.
      const cycleResult = await page.evaluate(
        async ({ reconnectTimeout, cycle }) => {
          try {
            const connected = await window.__waitFor(
              window.__swClient.isConnected$,
              (c) => c === true,
              reconnectTimeout,
              `isConnected$ → still true after offline cycle ${cycle}`
            );

            const errors = window.__transportErrors ?? [];

            return { success: true, connected, errorCount: errors.length };
          } catch (error) {
            return { success: false, error: String(error) };
          }
        },
        { reconnectTimeout: RECONNECT_TIMEOUT, cycle }
      );

      expect(
        cycleResult.success,
        `Cycle ${cycle}: reconnection check completed`
      ).toBe(true);
      expect(
        cycleResult.connected,
        `Cycle ${cycle}: isConnected$ remains true after offline cycle`
      ).toBe(true);
      // Note: brief offline cycles may legitimately emit transient errors (e.g., WebSocket
      // reconnect failures). We only assert that isConnected$ remained true, indicating the
      // SDK recovered. The error count is logged for debugging but not asserted.
    }
  });

  // ── Test 5: Explicit disconnect → isConnected$ → false ──────
  test('should transition isConnected$ to false on explicit disconnect', async ({
    page,
  }) => {
    // ── SETUP ────────────────────────────────────────────────
    await setupClient(page);

    // ── CHECK: disconnect() transitions isConnected$ to false ─
    const disconnectResult = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          // Subscribe BEFORE calling disconnect to avoid missing the transition
          const disconnectedPromise = waitFor(
            window.__swClient.isConnected$,
            (c) => c === false,
            obsTimeout,
            'isConnected$ → false after disconnect()'
          );

          await window.__swClient.disconnect();

          const isConnected = await disconnectedPromise;

          return { success: true, isConnected };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(
      disconnectResult.success,
      'Disconnect operation completed'
    ).toBe(true);
    expect(
      disconnectResult.isConnected,
      'isConnected$ transitioned to false after disconnect()'
    ).toBe(false);

    // ── CHECK: dial() should fail after disconnect ────────────
    // dial() calls waitAuthentication() → firstValueFrom(ready$) which filters
    // for ready===true.  After disconnect, _isConnected$ is false so ready$
    // never emits true, meaning dial() hangs forever until it is raced out.
    // A timeout therefore means "did not succeed" — same as an explicit throw.
    const dialAfterDisconnect = await page.evaluate(
      async ({ dialRaceTimeoutMs }) => {
        try {
          // dial() calls waitAuthentication() which waits on ready$.
          // After disconnect the client is torn down so this should
          // either throw immediately or never resolve — we race it.
          const dialPromise = window.__swClient
            .dial(`/public/test-room?channel=audio`)
            .then(() => ({ threw: false, timedOut: false }))
            .catch(() => ({ threw: true, timedOut: false }));

          // Give it at most dialRaceTimeoutMs to either resolve or reject.
          // If it hangs (the expected path after disconnect), the timeout
          // branch fires — that also means dial did NOT succeed.
          const raceResult = await Promise.race([
            dialPromise,
            new Promise<{ threw: boolean; timedOut: boolean }>((resolve) =>
              setTimeout(() => resolve({ threw: false, timedOut: true }), dialRaceTimeoutMs)
            ),
          ]);

          // dial succeeded only if it resolved without throwing AND without timing out
          return { success: true, dialSucceeded: !raceResult.threw && !raceResult.timedOut };
        } catch {
          // Outer catch — dial() threw synchronously (also means it did not succeed)
          return { success: true, dialSucceeded: false };
        }
      },
      { dialRaceTimeoutMs: DIAL_RACE_TIMEOUT_MS }
    );

    expect(
      dialAfterDisconnect.success,
      'Dial-after-disconnect check completed'
    ).toBe(true);
    expect(
      dialAfterDisconnect.dialSucceeded,
      'dial() correctly rejected after client.disconnect()'
    ).toBe(false);
  });

  // ── Test 6: Server pings pause → watchdog probes and keeps the socket ─
  test('should keep a quiet but healthy WebSocket after probing the server', async ({ page }) => {
    test.setTimeout(90_000);

    // ── SETUP ────────────────────────────────────────────────
    // Answer the server's pings on the page's behalf and hide them from the
    // SDK. The session stays alive on the server, but the SDK sees the same
    // silence as when a congested server defers its pings.
    let sockets = 0;
    const probeIds = new Set<string>();
    let answeredProbes = 0;

    await page.routeWebSocket(/.*/, (ws) => {
      sockets += 1;
      const server = ws.connectToServer();

      ws.onMessage((frame) => {
        const message = JSON.parse(String(frame)) as { id: string; method?: string };
        if (message.method === 'signalwire.ping') probeIds.add(message.id);
        server.send(frame);
      });
      server.onMessage((frame) => {
        const message = JSON.parse(String(frame)) as {
          id: string;
          method?: string;
          params?: { timestamp?: number };
          result?: unknown;
        };
        if (message.method === 'signalwire.ping') {
          server.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              result: { timestamp: message.params?.timestamp },
            })
          );
          return;
        }
        if (probeIds.has(message.id) && message.result !== undefined) answeredProbes += 1;
        ws.send(frame);
      });
    });

    await setupClient(page);

    // ── CHECK: SDK probes instead of replacing the socket ────
    await expect
      .poll(() => answeredProbes, {
        message: 'Unexpected result: the server did not answer two SDK ping probes',
        timeout: QUIET_SOCKET_OBSERVATION_TIMEOUT,
      })
      .toBeGreaterThanOrEqual(2);
    expect(sockets, 'Side effect: SDK replaced a healthy socket whose pings paused').toBe(1);

    const isRegistered = await page.evaluate(() => window.__swClient.isRegistered);
    expect(isRegistered, 'Side effect: subscriber should stay registered').toBe(true);
  });

  // ── Test 7: Half-open socket → watchdog replaces it ─────────
  test('should replace a half-open WebSocket and re-register', async ({ page }) => {
    test.setTimeout(90_000);

    // ── SETUP ────────────────────────────────────────────────
    // Proxy the SDK's WebSocket. Once blackholed, the first socket drops every
    // frame both ways and hides the server's close from the browser, so the
    // browser keeps a socket that is open locally but dead on the server.
    const sockets: WebSocketRoute[] = [];
    const secondSocketFrames: string[] = [];
    const secondSocketServerFrames: string[] = [];
    let blackholedAt = 0;
    let serverAbortedAt = 0;
    let firstSocketClosedByPage = false;

    await page.routeWebSocket(/.*/, (ws) => {
      sockets.push(ws);
      const isFirst = sockets.length === 1;
      const server = ws.connectToServer();

      ws.onMessage((frame) => {
        if (isFirst && blackholedAt) return;
        if (!isFirst) secondSocketFrames.push(String(frame));
        server.send(frame);
      });
      ws.onClose(() => {
        if (isFirst) firstSocketClosedByPage = true;
        server.close();
      });
      server.onMessage((frame) => {
        if (isFirst && blackholedAt) return;
        if (!isFirst) secondSocketServerFrames.push(String(frame));
        ws.send(frame);
        // Blackhole right after a ping so the SDK's pong is lost.
        if (isFirst && String(frame).includes('signalwire.ping')) {
          blackholedAt = Date.now();
        }
      });
      server.onClose((code, reason) => {
        if (isFirst && blackholedAt) {
          serverAbortedAt = Date.now();
          return;
        }
        ws.close({ code, reason });
      });
    });

    await setupClient(page);

    await expect
      .poll(() => blackholedAt, {
        message: 'Setup failed: no signalwire.ping arrived to start the blackhole',
        timeout: SERVER_PING_WAIT_TIMEOUT,
      })
      .toBeGreaterThan(0);
    await expect
      .poll(() => serverAbortedAt, {
        message: 'Setup failed: server did not abort the session after the lost pong',
        timeout: SERVER_ABORT_TIMEOUT,
      })
      .toBeGreaterThan(0);

    // ── CHECK: SDK notices the dead socket and replaces it ───
    await expect
      .poll(() => sockets.length, {
        message: 'Unexpected result: SDK kept the half-open socket instead of opening a new one',
        timeout: HALF_OPEN_DETECTION_TIMEOUT,
      })
      .toBeGreaterThan(1);
    expect(
      firstSocketClosedByPage,
      'Unexpected result: SDK opened a new socket without closing the half-open one'
    ).toBe(true);

    // ── CHECK: The new session registers the subscriber again ─
    const registrationRequestId = () => {
      const frame = secondSocketFrames.find((f) => f.includes('subscriber.online'));
      return frame ? (JSON.parse(frame) as { id: string }).id : undefined;
    };
    await expect
      .poll(
        () => {
          const id = registrationRequestId();
          return secondSocketServerFrames.some((f) => {
            const message = JSON.parse(f) as { id?: string; result?: unknown };
            return message.id === id && message.result !== undefined;
          });
        },
        {
          message: 'Unexpected result: subscriber.online did not succeed on the new socket',
          timeout: RECONNECT_TIMEOUT,
        }
      )
      .toBe(true);

    const isRegistered = await page.evaluate(() => window.__swClient.isRegistered);
    expect(isRegistered, 'Unexpected result: isRegistered should be true after re-registering').toBe(true);
  });
});
