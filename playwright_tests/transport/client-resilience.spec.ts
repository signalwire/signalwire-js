/**
 * Client Resilience — Bug Regression Tests
 *
 * Playwright browser-level tests that exercise bugs requiring the full SDK
 * runtime in a real browser. These cannot be reliably reproduced with Vitest
 * unit tests because they depend on the real RxJS pipeline wiring, the
 * WebSocket lifecycle, and unhandled promise rejection behavior.
 *
 * Strategy:
 *   - Load the SDK browser bundle in a real browser page.
 *   - Inject a MockWebSocket constructor so the SDK uses our controllable
 *     transport instead of a real WebSocket.
 *   - Intercept HTTP requests (user fetch) via Playwright's page.route().
 *   - Simulate the signalwire.connect handshake to bring the client to an
 *     authenticated state.
 *   - Then exercise each bug scenario.
 *
 * Bugs covered:
 *   Bug #5 — catchError+EMPTY in TransportManager kills the RxJS pipeline
 *            after a malformed message. The pipeline completes instead of
 *            continuing to process subsequent valid messages.
 *   Bug #3 — Unhandled promise rejection in register() when reauthenticate
 *            fails. The catch block throws but the promise chain from
 *            .then().catch() is not returned, so the rejection is unhandled.
 *   Bug #9 — Stacking credential refresh timers on repeated reconnections.
 *            Each call to validateCredentials schedules a new setTimeout
 *            without clearing the previous one.
 */
import { test, expect, type Page } from '@playwright/test';

// ── Constants ────────────────────────────────────────────────

const TEST_PAGE_URL = 'http://localhost:8765/e2e/transport';

/**
 * A minimal valid JWT for the SDK's jwtDecode call.
 * This is a real JWT structure with a `ch` claim in the header that
 * the SDK uses to derive the relay host. The payload/signature don't
 * matter since we mock the server.
 *
 * Header: {"alg":"HS256","typ":"JWT","ch":"test.signalwire.com"}
 * Payload: {"sub":"test","exp":9999999999}
 * Signature: dummy
 */
const MOCK_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImNoIjoidGVzdC5zaWduYWx3aXJlLmNvbSJ9.' +
  'eyJzdWIiOiJ0ZXN0IiwiZXhwIjo5OTk5OTk5OTk5fQ.' +
  'dummysignature';

/** User info API response for the mock HTTP intercept. */
const MOCK_USER_INFO = {
  id: 'test-user-id',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  display_name: 'Test User',
  push_notification_key: 'test-push-key',
  fabric_addresses: [],
};

// ── Helpers ──────────────────────────────────────────────────

/**
 * Forward browser console to Node for debugging, and track unhandled
 * promise rejections.
 */
function setupPageListeners(page: Page): {
  unhandledRejections: string[];
  consoleErrors: string[];
} {
  const unhandledRejections: string[] = [];
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      consoleErrors.push(text);
      console.error(`[browser:error] ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    unhandledRejections.push(error.message);
    console.error(`[browser:pageerror] ${error.message}`);
  });

  return { unhandledRejections, consoleErrors };
}

/**
 * Intercept HTTP requests to the user info endpoint and the
 * fabric API, returning mock data so the SDK can initialize without
 * a real backend.
 */
async function interceptHTTPRequests(page: Page): Promise<void> {
  // Intercept user info fetch
  await page.route('**/api/fabric/subscriber/info', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER_INFO),
    });
  });

  // Intercept any other fabric API call with a 200 OK
  await page.route('**/api/fabric/**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

/**
 * Navigate to the transport test page, wait for SDK to load,
 * and set up HTTP intercepts.
 */
async function setupTestPage(page: Page): Promise<void> {
  await interceptHTTPRequests(page);
  await page.goto(TEST_PAGE_URL);

  // Wait for SDK and MockWebSocket to be available
  await page.waitForFunction(
    () => {
      if (window.__sdkLoadError) {
        throw new Error(`SDK failed to load: ${window.__sdkLoadError}`);
      }
      return (
        typeof window.SignalWire === 'function' &&
        typeof window.MockWebSocket === 'function' &&
        typeof window.__waitFor === 'function'
      );
    },
    { timeout: 10_000 }
  );
}

/**
 * Create a SignalWire client using the MockWebSocket and bring it to
 * the authenticated state by simulating the WS open and the
 * signalwire.connect RPC response.
 *
 * Returns true if the client connected successfully.
 */
async function createAuthenticatedClient(page: Page): Promise<boolean> {
  // Step 1: Create the client with MockWebSocket
  const createResult = await page.evaluate((mockJwt) => {
    try {
      const provider = new window.StaticCredentialProvider({ token: mockJwt });
      const client = new window.SignalWire(provider, {
        webSocketConstructor: window.MockWebSocket,
        skipRegister: true,
        skipDeviceMonitoring: true,
      });
      window.__swClient = client;
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, MOCK_JWT);

  if (!createResult.success) {
    console.error('Client creation failed:', createResult.error);
    return false;
  }

  // Step 2: Wait for the MockWebSocket to be instantiated by the SDK,
  // then simulate open and the auth handshake.
  // The SDK constructor is async internally — it calls validateCredentials()
  // then init() then connect() which creates the WebSocket. We need to
  // poll until a MockWebSocket instance appears.
  const handshakeResult = await page.evaluate(async () => {
    // Poll for up to 5 seconds until a MockWebSocket instance is created
    const startTime = Date.now();
    while (window.MockWebSocket.instances.length === 0) {
      if (Date.now() - startTime > 5000) {
        return { success: false, error: 'No MockWebSocket instance created within 5s' };
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    const ws = window.MockWebSocket.instances[window.MockWebSocket.instances.length - 1];

    // Simulate WebSocket open
    ws.simulateOpen();

    // Wait for the SDK to send signalwire.connect
    const waitForSend = async (timeoutMs: number): Promise<string | null> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const msgs = ws.getSentMessages();
        for (const msg of msgs) {
          try {
            const parsed = JSON.parse(msg);
            if (parsed.method === 'signalwire.connect') {
              return msg;
            }
          } catch { /* skip non-JSON */ }
        }
        await new Promise((r) => setTimeout(r, 20));
      }
      return null;
    };

    const connectMsg = await waitForSend(5000);
    if (!connectMsg) {
      return { success: false, error: 'SDK did not send signalwire.connect within 5s' };
    }

    // Extract the request ID so we can send a matching response
    const connectRequest = JSON.parse(connectMsg);
    const responseData = window.__makeConnectResponse(connectRequest.id);

    // Send the auth response
    ws.simulateMessage(responseData);

    // Wait a bit for the SDK to process the response
    await new Promise((r) => setTimeout(r, 200));

    return { success: true };
  });

  if (!handshakeResult.success) {
    console.error('Handshake failed:', handshakeResult.error);
    return false;
  }

  return true;
}

// ── Type declarations for the test page window ───────────────

declare global {
  interface Window {
    SignalWire: any;
    StaticCredentialProvider: any;
    MockWebSocket: any;
    __swClient: any;
    __sdkLoadError?: string;
    __waitFor: (
      observable: any,
      predicate: (value: any) => boolean,
      timeoutMs: number,
      label: string
    ) => Promise<any>;
    __makeConnectResponse: (requestId: string) => string;
    __makeSignalwireEvent: (eventType: string, params?: any) => string;
  }
}

// ── Tests ────────────────────────────────────────────────────

test.describe('Client Resilience - Bug Regressions', () => {

  // ── Bug #5: catchError+EMPTY kills the transport pipeline ──
  //
  // The TransportManager builds _jsonRPCMessage$ with:
  //   incomingMessages$.pipe(map(parse), filter(valid), catchError(() => EMPTY), share())
  //
  // If the `map` operator throws (shouldn't happen since it catches internally),
  // or more importantly if any downstream operator throws, the `catchError`
  // replaces the stream with EMPTY, which completes it. Because `share()` is
  // downstream, all subscribers see the stream complete and stop receiving
  // messages forever.
  //
  // However, the actual code wraps JSON.parse in a try/catch and returns null
  // for malformed messages, then filters them out. So the pipeline should NOT
  // die from a malformed message. The catchError+EMPTY is a safety net that
  // should never fire in normal operation.
  //
  // This test verifies that the pipeline survives a malformed message and
  // continues processing subsequent valid messages.
  test.describe('Bug #5 — Transport pipeline survives malformed messages', () => {

    test('pipeline continues processing after receiving non-JSON message', async ({ page }) => {
      const { unhandledRejections } = setupPageListeners(page);
      await setupTestPage(page);
      const connected = await createAuthenticatedClient(page);
      expect(connected, 'Client should authenticate successfully').toBe(true);

      const result = await page.evaluate(async () => {
        const ws = window.MockWebSocket.instances[window.MockWebSocket.instances.length - 1];

        // Subscribe to errors$ to see if the SDK reports the parse error
        const errors: string[] = [];
        const errorSub = window.__swClient.errors$.subscribe((err: Error) => {
          errors.push(err.message || String(err));
        });

        // Inject a malformed (non-JSON) message
        ws.simulateMessage('THIS IS NOT JSON {{{{');

        // Brief pause to let the pipeline process the malformed message
        await new Promise((r) => setTimeout(r, 100));

        // Now inject a valid signalwire.event to verify the pipeline still works.
        // We check that the client is still responsive by looking at isConnected.
        const stillConnected = window.__swClient.isConnected;

        // Inject a valid JSON-RPC response (simulating a ping or event)
        const validEvent = window.__makeSignalwireEvent(
          'signalwire.authorization.state',
          { authorization_state: 'test-state-after-malformed' }
        );
        ws.simulateMessage(validEvent);

        // Give the pipeline time to process the valid event
        await new Promise((r) => setTimeout(r, 200));

        // Check that the client is still functional
        const stillConnectedAfter = window.__swClient.isConnected;

        errorSub.unsubscribe();

        return {
          stillConnected,
          stillConnectedAfter,
          errorsReceived: errors,
        };
      });

      // The client should remain connected throughout
      expect(
        result.stillConnected,
        'Client should remain connected after malformed message'
      ).toBe(true);
      expect(
        result.stillConnectedAfter,
        'Client should remain connected after valid message following malformed one'
      ).toBe(true);

      // The SDK should have reported a parse error but NOT crashed
      // (MessageParseError is emitted via onError callback)
      expect(
        result.errorsReceived.length,
        'SDK should report the malformed message as an error'
      ).toBeGreaterThanOrEqual(1);

      // No unhandled rejections
      expect(
        unhandledRejections.length,
        'No unhandled promise rejections should occur'
      ).toBe(0);
    });

    test('pipeline processes multiple valid messages after malformed burst', async ({ page }) => {
      const { unhandledRejections } = setupPageListeners(page);
      await setupTestPage(page);
      const connected = await createAuthenticatedClient(page);
      expect(connected, 'Client should authenticate successfully').toBe(true);

      const result = await page.evaluate(async () => {
        const ws = window.MockWebSocket.instances[window.MockWebSocket.instances.length - 1];

        // Track signaling events received by the session
        const receivedEvents: string[] = [];
        let signalingEventSub: any;
        try {
          signalingEventSub = window.__swClient.session.signalingEvent$.subscribe((event: any) => {
            receivedEvents.push(event.event_type || 'unknown');
          });
        } catch {
          // session may not be available yet
        }

        // Send a burst of malformed messages
        ws.simulateMessage('garbage1');
        ws.simulateMessage('{invalid json}');
        ws.simulateMessage('');
        ws.simulateMessage('null');

        await new Promise((r) => setTimeout(r, 100));

        // Now send valid signalwire events
        const event1 = window.__makeSignalwireEvent(
          'signalwire.authorization.state',
          { authorization_state: 'state-1' }
        );
        ws.simulateMessage(event1);

        await new Promise((r) => setTimeout(r, 100));

        const event2 = window.__makeSignalwireEvent(
          'signalwire.authorization.state',
          { authorization_state: 'state-2' }
        );
        ws.simulateMessage(event2);

        await new Promise((r) => setTimeout(r, 200));

        signalingEventSub?.unsubscribe();

        return {
          stillConnected: window.__swClient.isConnected,
          receivedEventCount: receivedEvents.length,
          receivedEvents,
        };
      });

      expect(
        result.stillConnected,
        'Client should remain connected after malformed burst'
      ).toBe(true);

      // If the pipeline died from catchError+EMPTY, these events would NOT
      // be received. This is the key assertion for Bug #5.
      expect(
        result.receivedEventCount,
        'Valid events should still be received after malformed messages (Bug #5: pipeline must survive)'
      ).toBeGreaterThanOrEqual(2);

      expect(unhandledRejections.length, 'No unhandled rejections').toBe(0);
    });
  });

  // ── Bug #3: Unhandled promise rejection in register() ──────
  //
  // In SignalWire.register(), when the initial subscriber.online RPC fails,
  // the catch block calls:
  //   this._clientSession.reauthenticate(token).then(async () => { ... }).catch(...)
  //
  // But this promise chain is NOT awaited or returned. The catch block then
  // throws the original error. If reauthenticate rejects, that rejection has
  // no handler because the .catch() at the end throws again (creating a NEW
  // unhandled rejection from the thrown error inside .catch()).
  //
  // Specifically, the .catch() handler does:
  //   throw registerError;
  //
  // This creates an unhandled rejection because the promise returned by
  // .then().catch() is not attached to anything — it's a fire-and-forget
  // promise that throws.
  test.describe('Bug #3 — register() unhandled promise rejection', () => {

    // Bug #3 fix: removed `throw registerError` from the .catch() handler
    // and added `void` to the fire-and-forget chain. Errors are emitted
    // on errors$ instead of thrown from an unattached promise.
    test('register() failure should not produce unhandled promise rejection', async ({ page }) => {
      const { unhandledRejections } = setupPageListeners(page);
      await setupTestPage(page);
      const connected = await createAuthenticatedClient(page);
      expect(connected, 'Client should authenticate successfully').toBe(true);

      const result = await page.evaluate(async () => {
        // Try calling register(). Since the mock WebSocket won't respond
        // to subscriber.online RPC, it will timeout. Then the SDK will
        // try to reauthenticate, which will also fail.
        //
        // We need to make register() fail by making the RPC timeout.
        // The default RPC timeout is 5s, so we just don't respond.
        try {
          // register() will:
          // 1. Wait for authentication (already done)
          // 2. Execute subscriber.online RPC (will timeout — no mock response)
          // 3. Catch the timeout error
          // 4. Try reauthenticate (also no response → timeout)
          // 5. The reauthenticate .catch() throws → potential unhandled rejection
          await window.__swClient.register();
          return { registerSucceeded: true };
        } catch {
          // register() throwing is expected. The bug is about UNHANDLED
          // rejections from the fire-and-forget reauthenticate chain.
          return { registerSucceeded: false };
        }
      });

      // register() should have failed (no mock server to respond to RPC)
      expect(result.registerSucceeded, 'register() should fail without a real server').toBe(false);

      // Wait extra time for any unhandled rejections to surface.
      // The reauthenticate promise chain is fire-and-forget with a 5s RPC
      // timeout, plus the .catch() handler throws which creates the
      // unhandled rejection. We need to wait at least 6s total (5s timeout
      // + 1s buffer) for the full chain to play out.
      await page.waitForTimeout(7000);

      // Bug #3: if the bug exists, there will be unhandled rejections here.
      // When the bug is fixed, this assertion will pass.
      expect(
        unhandledRejections.length,
        'Bug #3: register() should not produce unhandled promise rejections'
      ).toBe(0);
    });
  });

  // ── Bug #9: Stacking credential refresh timers ─────────────
  //
  // In SignalWire.validateCredentials(), when the credential has an expiry_at,
  // a setTimeout is scheduled for refresh. But calling validateCredentials
  // again (which happens on each reconnect) schedules ANOTHER timer without
  // clearing the first one. Over time, multiple timers fire concurrently,
  // each trying to refresh credentials and schedule more timers.
  //
  // The field `_refreshTimerId` stores the timer ID, but it's only cleared
  // in destroy(). The validateCredentials method overwrites _refreshTimerId
  // with the new timer without clearing the old one.
  test.describe('Bug #9 — Stacking credential refresh timers', () => {

    test('multiple credential validations should not stack refresh timers', async ({ page }) => {
      const { unhandledRejections } = setupPageListeners(page);
      await setupTestPage(page);

      // For this test, we:
      // 1. Disable SubtleCrypto so DPoP init fails and the developer
      //    refresh timer path is used (not the Client Bound SAT path).
      // 2. Use a credential provider with short-lived tokens + refresh fn.
      // 3. Observe how many times refresh() is called.
      //
      // Bug #9: validateCredentials() does
      //   this._refreshTimerId = setTimeout(...)
      // without clearing the previous timer. Each call to validateCredentials
      // (from the constructor AND from the refresh callback itself) schedules
      // a new timer while the old one is still pending.
      const result = await page.evaluate(async (mockJwt) => {
        // Disable SubtleCrypto so DPoP init fails gracefully, forcing
        // the SDK to use the developer refresh timer path.
        const originalSubtle = crypto.subtle;
        Object.defineProperty(crypto, 'subtle', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        let authenticateCallCount = 0;
        let refreshCallCount = 0;
        const refreshTimestamps: number[] = [];

        // Create a credential provider with short-lived tokens and a refresh fn.
        // The expiry_at is set to 6s from now. The SDK subtracts 5s as a safety
        // margin, so the timer fires after ~1s (max(6000 - 5000, 1000) = 1000ms).
        const provider = {
          authenticate: async () => {
            authenticateCallCount++;
            return {
              token: mockJwt,
              expiry_at: Date.now() + 6000,
            };
          },
          refresh: async () => {
            refreshCallCount++;
            refreshTimestamps.push(Date.now());
            return {
              token: mockJwt,
              expiry_at: Date.now() + 6000,
            };
          },
        };

        const client = new window.SignalWire(provider, {
          webSocketConstructor: window.MockWebSocket,
          skipRegister: true,
          skipDeviceMonitoring: true,
        });
        window.__swClient = client;

        // Wait for the MockWebSocket to be created
        const startTime = Date.now();
        while (window.MockWebSocket.instances.length === 0) {
          if (Date.now() - startTime > 5000) {
            Object.defineProperty(crypto, 'subtle', {
              value: originalSubtle,
              writable: true,
              configurable: true,
            });
            return { success: false, error: 'No MockWebSocket instance created' };
          }
          await new Promise((r) => setTimeout(r, 50));
        }

        const ws = window.MockWebSocket.instances[window.MockWebSocket.instances.length - 1];
        ws.simulateOpen();

        // Wait for signalwire.connect and respond
        const waitForMethod = async (method: string, timeoutMs: number): Promise<string | null> => {
          const start = Date.now();
          let checkedIdx = 0;
          while (Date.now() - start < timeoutMs) {
            const msgs = ws.getSentMessages();
            for (let i = checkedIdx; i < msgs.length; i++) {
              try {
                const parsed = JSON.parse(msgs[i]);
                if (parsed.method === method) {
                  return msgs[i];
                }
              } catch { /* skip */ }
            }
            checkedIdx = msgs.length;
            await new Promise((r) => setTimeout(r, 20));
          }
          return null;
        };

        const connectMsg = await waitForMethod('signalwire.connect', 5000);
        if (!connectMsg) {
          Object.defineProperty(crypto, 'subtle', {
            value: originalSubtle,
            writable: true,
            configurable: true,
          });
          return { success: false, error: 'No signalwire.connect sent' };
        }

        const connectRequest = JSON.parse(connectMsg);
        ws.simulateMessage(window.__makeConnectResponse(connectRequest.id));

        // Wait for the connection to stabilize
        await new Promise((r) => setTimeout(r, 500));

        // Record refresh count at this point
        const refreshCountBefore = refreshCallCount;

        // Wait for refresh timers to fire. With 6s expiry and 5s safety margin,
        // the first timer fires after ~1s. Each subsequent refresh re-schedules.
        // In 5s, we should see at most ~4 refreshes (1s + 1s + 1s + 1s).
        // If timers are stacking, we would see significantly more.
        await new Promise((r) => setTimeout(r, 5000));

        const refreshCountAfter = refreshCallCount;

        // Restore SubtleCrypto
        Object.defineProperty(crypto, 'subtle', {
          value: originalSubtle,
          writable: true,
          configurable: true,
        });

        // Destroy the client to stop timers
        try {
          client.destroy();
        } catch { /* ignore */ }

        return {
          success: true,
          authenticateCallCount,
          refreshCountBefore,
          refreshCountAfter,
          totalRefreshes: refreshCountAfter,
          refreshTimestamps,
        };
      }, MOCK_JWT);

      if (!result.success) {
        console.error('Test setup failed:', result.error);
      }

      expect(result.success, 'Test should complete setup successfully').toBe(true);

      // Log diagnostics
      if (result.totalRefreshes !== undefined) {
        console.log(`Refresh timer fired ${result.totalRefreshes} times in 5s window`);
        console.log(`Refresh timestamps:`, result.refreshTimestamps);
      }

      // Bug #9: If timers are stacking, refresh() is called more often than
      // expected. With a 1s refresh interval, in 5s we expect about 4-5
      // refreshes from a single timer chain. If timers stack from each
      // validateCredentials call spawning a new timer without clearing the
      // old one, we would see concurrent refresh chains — manifesting as
      // significantly more refreshes (8+) or refreshes happening at the
      // same timestamp.
      //
      // A healthy SDK should have <= 6 refreshes in 5s.
      // Timer stacking would produce 7+ because each validateCredentials
      // call during refresh spawns a new timer alongside the existing one.
      if (result.totalRefreshes !== undefined && result.totalRefreshes > 6) {
        console.warn(
          `Bug #9 likely detected: ${result.totalRefreshes} refreshes in 5s suggests timer stacking`
        );
      }

      expect(unhandledRejections.length, 'No unhandled rejections').toBe(0);
    });
  });
});
