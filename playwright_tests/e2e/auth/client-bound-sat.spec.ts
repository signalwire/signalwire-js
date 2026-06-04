/**
 * E2E tests for Client Bound SAT (DPoP) feature.
 *
 * Validates four authentication scenarios:
 * 1. Standard SAT without sat:refresh scope — DPoP skipped
 * 2. SAT with sat:refresh scope but no matching fingerprint — activation fails gracefully
 * 3. SAT with sat:refresh scope + SDK fingerprint — full DPoP lifecycle with refresh
 * 4. WebSocket drops after DPoP activation, token expires during disconnect,
 *    SDK re-authenticates with fresh credentials on reconnect
 *
 * None of these tests start a call — they verify the authentication and token
 * refresh lifecycle by staying connected and monitoring SDK behavior.
 */
import { test, expect, createSATToken } from '../fixtures';
import { gotoTestPage } from '../helpers/setup';

const CONNECTION_TIMEOUT = 15_000;
const DPOP_ACTIVATION_TIMEOUT = 10_000;

/**
 * Short SAT expiry for refresh cycle tests.
 * The SDK schedules refresh at (expires_at - 30s buffer), so with 90s expiry
 * the device token refresh fires ~60s after activation. We add margin for
 * network latency and server processing.
 */
const SHORT_SAT_EXPIRE_IN_S = 90;
const REFRESH_CYCLE_TIMEOUT = 80_000;

test.describe('Client Bound SAT (DPoP)', () => {
  test.afterEach(async ({ page }) => {
    // Restore network in case test failed during offline phase
    await page.context().setOffline(false).catch(() => {});
    await page
      .evaluate(async () => {
        try {
          if (window.__swClient) await window.__swClient.disconnect();
        } catch {}
      })
      .catch(() => {});
  });

  // ────────────────────────────────────────────────────────────
  // Test 1: Standard SAT without sat:refresh scope
  // ────────────────────────────────────────────────────────────

  test('connects without DPoP when SAT has no sat:refresh scope', async ({
    page,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    // Creating a standard SAT without sat:refresh scope (no fingerprint) — DPoP should be skipped
    const token = await createSATToken();
    expect(token, 'Setup failed: Could not create SAT token').toBeTruthy();

    await gotoTestPage(page);

    // Collect console messages to verify DPoP behavior
    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ token, connTimeout, dpopTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          // Use StaticCredentialProvider — no fingerprint forwarded
          const provider = new window.StaticCredentialProvider({ token });
          // logLevel: 'debug' — assertions below rely on DPoP log messages
          const client = new window.SignalWire(provider, { logLevel: 'debug' });
          window.__swClient = client;

          await waitFor(
            client.isConnected$,
            (c) => c === true,
            connTimeout,
            'isConnected$ → true'
          );

          // Stay connected briefly to allow DPoP activation path to run
          await new Promise((r) => setTimeout(r, 3000));

          // Verify client is still connected (no errors from DPoP)
          const connected = await waitFor(
            client.isConnected$,
            (c) => c === true,
            dpopTimeout,
            'isConnected$ → still true after DPoP check'
          );

          return { success: true, connected };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      {
        token,
        connTimeout: CONNECTION_TIMEOUT,
        dpopTimeout: DPOP_ACTIVATION_TIMEOUT,
      }
    );

    expect(
      result.success,
      `Connection failed: ${result.success ? '' : result.error}`
    ).toBe(true);
    expect(result.connected, 'Unexpected result: client should still be connected').toBe(
      true
    );

    // Verify DPoP was initialized but activation was skipped (no sat:refresh scope)
    const dpopInitialized = consoleLogs.some((log) =>
      log.includes('DPoP initialized')
    );
    const activationSkipped = consoleLogs.some((log) =>
      log.includes('No sat:refresh scope')
    );
    const activationSucceeded = consoleLogs.some((log) =>
      log.includes('Client Bound SAT activated')
    );

    expect(
      dpopInitialized,
      'Unexpected result: DPoP should have been initialized'
    ).toBe(true);
    expect(
      activationSkipped,
      'Unexpected result: Client Bound SAT activation should have been skipped'
    ).toBe(true);
    expect(
      activationSucceeded,
      'Side effect: Client Bound SAT should NOT have been activated'
    ).toBe(false);
  });

  // ────────────────────────────────────────────────────────────
  // Test 2: SAT with sat:refresh scope but no client fingerprint
  //         → server binds on first use, then auto-refresh fires
  // ────────────────────────────────────────────────────────────

  test('activates and refreshes Client Bound SAT without fingerprint at issuance', async ({
    page,
  }) => {
    // Unbound SATs have a max 60s TTL. Refresh fires at (60s - 30s buffer) ≈ 30s.
    // We wait for TWO refresh cycles: ~30s + ~30s = ~60s, plus connection overhead.
    test.setTimeout(REFRESH_CYCLE_TIMEOUT * 2 + 30_000);

    // ── SETUP ──────────────────────────────────────────────
    // Request a SAT with sat:refresh scope but WITHOUT a fingerprint.
    // The server issues an unbound short-lived token (max 60s TTL).
    // The SDK sees sat:refresh, activates DPoP (server binds on first use),
    // then the scheduled refresh fires before the short token expires.
    const token = await createSATToken({ scope: 'sat:refresh' });
    expect(token, 'Setup failed: Could not create SAT token with sat:refresh scope').toBeTruthy();

    await gotoTestPage(page);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ token, connTimeout, refreshWait }) => {
        const waitFor = window.__waitFor;
        try {
          const provider = new window.StaticCredentialProvider({ token });
          // logLevel: 'debug' — assertions below rely on DPoP log messages
          const client = new window.SignalWire(provider, { logLevel: 'debug' });
          window.__swClient = client;

          await waitFor(
            client.isConnected$,
            (c) => c === true,
            connTimeout,
            'isConnected$ → true'
          );

          // Wait for TWO full refresh cycles to complete.
          // Unbound SAT: 60s TTL → first refresh at ~30s, second at ~60s.
          await new Promise((r) => setTimeout(r, refreshWait));

          // Verify client is still connected after refresh
          const connected = await waitFor(
            client.isConnected$,
            (c) => c === true,
            10000,
            'isConnected$ → still true after refresh cycle'
          );

          return { success: true, connected };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      {
        token,
        connTimeout: CONNECTION_TIMEOUT,
        refreshWait: 90_000,
      }
    );

    expect(
      result.success,
      `Connection failed: ${result.success ? '' : result.error}`
    ).toBe(true);
    expect(
      result.connected,
      'Unexpected result: client should be connected after refresh cycle'
    ).toBe(true);

    // Verify the full lifecycle: activation → reauth → refresh → reauth → refresh → reauth
    const activationSucceeded = consoleLogs.some((log) =>
      log.includes('Client Bound SAT activated successfully')
    );
    // Count refreshes: expect at least 2 (two refresh cycles)
    const refreshCount = consoleLogs.filter((log) =>
      log.includes('Client Bound SAT refreshed successfully')
    ).length;
    // Count reauthentications: one after activation + one per refresh = at least 3
    const reauthCount = consoleLogs.filter((log) =>
      log.includes('Re-authentication successful')
    ).length;

    const dpopLogs = consoleLogs.filter(
      (log) =>
        log.includes('DPoP') ||
        log.includes('DeviceToken') ||
        log.includes('Client Bound') ||
        log.includes('Re-authenticat')
    );
    const diagnostics = `\nDPoP-related logs:\n${dpopLogs.join('\n')}\n`;

    expect(
      activationSucceeded,
      `Client Bound SAT should have been activated (server binds on first use).${diagnostics}`
    ).toBe(true);
    expect(
      refreshCount,
      `Client Bound SAT should have been refreshed at least twice, got ${refreshCount}.${diagnostics}`
    ).toBeGreaterThanOrEqual(2);
    expect(
      reauthCount,
      `Session should have reauthenticated at least 3 times (activation + 2 refreshes), got ${reauthCount}.${diagnostics}`
    ).toBeGreaterThanOrEqual(3);
  });

  // ────────────────────────────────────────────────────────────
  // Test 3: Full DPoP flow — fingerprint forwarded + auto-refresh
  // ────────────────────────────────────────────────────────────

  test('full DPoP lifecycle: fingerprint forwarded, activation, and auto-refresh', async ({
    page,
  }) => {
    // Short SAT (90s) → first refresh at ~60s, second at ~120s.
    // Wait for TWO refresh cycles plus connection overhead.
    test.setTimeout(REFRESH_CYCLE_TIMEOUT * 3 + 30_000);

    await gotoTestPage(page);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    // ── SETUP ──────────────────────────────────────────────
    // Expose a Node function the browser credential provider calls
    // to create a short-lived SAT bound to the SDK's real fingerprint
    const shortExpireAt = Math.floor(Date.now() / 1000) + SHORT_SAT_EXPIRE_IN_S;
    await page.exposeFunction(
      '__createSATWithFingerprint',
      async (fingerprint: string) => {
        return createSATToken({ fingerprint, expire_at: shortExpireAt });
      }
    );

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ connTimeout, refreshWait, shortExpireIn }) => {
        const waitFor = window.__waitFor;
        try {
          let receivedFingerprint: string | undefined;

          // Custom credential provider that forwards the SDK's DPoP fingerprint
          const provider = {
            authenticate: async (context: { fingerprint?: string } = {}) => {
              receivedFingerprint = context.fingerprint;
              if (!receivedFingerprint) {
                throw new Error('Expected SDK to provide DPoP fingerprint');
              }

              const fetchSAT = (window as any).__createSATWithFingerprint as (
                fp: string
              ) => Promise<string>;
              const token = await fetchSAT(receivedFingerprint);

              return {
                token,
                expiry_at: Date.now() + shortExpireIn * 1000,
              };
            },
          };

          // logLevel: 'debug' — assertions below rely on DPoP log messages
          const client = new window.SignalWire(provider, { logLevel: 'debug' });
          window.__swClient = client;

          await waitFor(
            client.isConnected$,
            (c) => c === true,
            connTimeout,
            'isConnected$ → true (DPoP flow)'
          );

          // Wait for TWO refresh cycles to fire.
          // Short SAT (90s) with 30s buffer → first refresh at ~60s, second at ~120s.
          await new Promise((r) => setTimeout(r, refreshWait));

          // Verify client is still connected after refresh
          const connected = await waitFor(
            client.isConnected$,
            (c) => c === true,
            10000,
            'isConnected$ → still true after refresh cycle'
          );

          return {
            success: true,
            connected,
            fingerprintReceived: !!receivedFingerprint,
            fingerprintLength: receivedFingerprint?.length,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      {
        connTimeout: CONNECTION_TIMEOUT,
        refreshWait: REFRESH_CYCLE_TIMEOUT * 2,
        shortExpireIn: SHORT_SAT_EXPIRE_IN_S,
      }
    );

    expect(
      result.success,
      `DPoP flow failed: ${result.success ? '' : result.error}`
    ).toBe(true);
    expect(
      result.connected,
      'Unexpected result: client should still be connected after refresh'
    ).toBe(true);

    // Verify fingerprint was generated and forwarded
    expect(
      result.fingerprintReceived,
      'Unexpected result: authenticate() should have received a fingerprint'
    ).toBe(true);
    expect(
      result.fingerprintLength,
      'Unexpected result: fingerprint should be 43 chars (base64url SHA-256)'
    ).toBe(43);

    // Verify the full DPoP lifecycle via console logs
    const dpopLogs = consoleLogs.filter(
      (log) =>
        log.includes('DPoP') ||
        log.includes('DeviceToken') ||
        log.includes('Client Bound') ||
        log.includes('Re-authenticat')
    );
    const diagnostics = `\nDPoP-related logs:\n${dpopLogs.join('\n')}\n`;

    const dpopInitialized = consoleLogs.some((log) =>
      log.includes('DPoP initialized')
    );
    const activationSucceeded = consoleLogs.some((log) =>
      log.includes('Client Bound SAT activated successfully')
    );
    // Count refreshes: expect at least 2 (two refresh cycles)
    const refreshCount = consoleLogs.filter((log) =>
      log.includes('Client Bound SAT refreshed successfully')
    ).length;
    // Count reauthentications: one after activation + one per refresh = at least 3
    const reauthCount = consoleLogs.filter((log) =>
      log.includes('Re-authentication successful')
    ).length;

    expect(
      dpopInitialized,
      `DPoP should have been initialized.${diagnostics}`
    ).toBe(true);
    expect(
      activationSucceeded,
      `Client Bound SAT should have been activated.${diagnostics}`
    ).toBe(true);
    expect(
      refreshCount,
      `Client Bound SAT should have been refreshed at least twice, got ${refreshCount}.${diagnostics}`
    ).toBeGreaterThanOrEqual(2);
    expect(
      reauthCount,
      `Session should have reauthenticated at least 3 times (activation + 2 refreshes), got ${reauthCount}.${diagnostics}`
    ).toBeGreaterThanOrEqual(3);
  });

  // ────────────────────────────────────────────────────────────
  // Test 4: Reconnect after token expires during WebSocket disconnect
  // ────────────────────────────────────────────────────────────

  test('re-authenticates with fresh credentials when token expires during disconnect', async ({
    page,
  }) => {
    // Very short SAT (40s) + network offline for 50s → token is expired on reconnect.
    // The SDK must detect the expired token, re-authenticate, and re-activate DPoP.
    //
    // Network simulation uses the same pattern as the old SDK's badNetwork tests:
    // context.setOffline(true/false). The server's ping timeout (~10-15s) naturally
    // closes the WebSocket during the offline period — no manual ws.close needed.
    const VERY_SHORT_EXPIRE_IN_S = 40;
    const OFFLINE_DURATION_MS = 50_000;
    test.setTimeout(OFFLINE_DURATION_MS + 90_000);

    await gotoTestPage(page);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    await page.exposeFunction(
      '__createSATWithFingerprint',
      async (fingerprint: string) => {
        const expire_at = Math.floor(Date.now() / 1000) + VERY_SHORT_EXPIRE_IN_S;
        return createSATToken({
          fingerprint,
          scope: 'sat:refresh',
          expire_at,
        });
      }
    );

    // ── PHASE 1: Connect + DPoP activation ────────────────
    const setupResult = await page.evaluate(
      async ({ connTimeout, shortExpireIn }) => {
        const waitFor = window.__waitFor;
        try {
          let authenticateCallCount = 0;
          const receivedFingerprints: string[] = [];

          const provider = {
            authenticate: async (context: { fingerprint?: string } = {}) => {
              authenticateCallCount++;
              const fingerprint = context.fingerprint;
              if (!fingerprint) {
                throw new Error('Expected SDK to provide DPoP fingerprint');
              }
              receivedFingerprints.push(fingerprint);

              const fetchSAT = (window as any).__createSATWithFingerprint as (
                fp: string
              ) => Promise<string>;
              const token = await fetchSAT(fingerprint);

              return {
                token,
                expiry_at: Date.now() + shortExpireIn * 1000,
              };
            },
          };

          // logLevel: 'debug' — assertions below rely on DPoP log messages
          const client = new window.SignalWire(provider, { logLevel: 'debug' });
          window.__swClient = client;
          (window as any).__getAuthCount = () => authenticateCallCount;
          (window as any).__getFingerprints = () => receivedFingerprints;

          await waitFor(
            client.isConnected$,
            (c) => c === true,
            connTimeout,
            'isConnected$ → true (initial connection)'
          );

          // Wait for DPoP activation to complete
          await new Promise((r) => setTimeout(r, 5000));

          return {
            success: true,
            callsAfterActivation: authenticateCallCount,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      {
        connTimeout: CONNECTION_TIMEOUT,
        shortExpireIn: VERY_SHORT_EXPIRE_IN_S,
      }
    );

    expect(
      setupResult.success,
      `Initial connection failed: ${setupResult.success ? '' : setupResult.error}`
    ).toBe(true);

    const callsAfterActivation = setupResult.callsAfterActivation;

    // ── PHASE 2: Network down → token expires → network up ──
    // Same pattern as the old SDK's roomSessionBadNetwork tests:
    // setOffline kills new connections, and the server's ping timeout
    // naturally closes the existing WebSocket during the offline period.
    await page.context().setOffline(true);

    // Wait for the token to expire while offline (50s > 40s token TTL).
    // The server's ping timeout (~10-15s) will close the WebSocket
    // well before the offline period ends.
    await new Promise((r) => setTimeout(r, OFFLINE_DURATION_MS));

    // Restore network — SDK should reconnect
    await page.context().setOffline(false);

    // ── PHASE 3: Verify reconnection with re-authentication ──
    // Monitor console logs to detect successful reconnection.
    // isConnected$ is only set during initial connect(), not on
    // automatic WebSocket reconnection, so we poll logs instead.
    const reconnectTimeout = 60_000;
    const reconnected = await Promise.race([
      (async () => {
        const startTime = Date.now();
        while (Date.now() - startTime < reconnectTimeout) {
          const authSuccessCount = consoleLogs.filter(
            (log) => log.includes('Authentication completed successfully')
          ).length;
          // At least 2: initial connect + reconnect
          if (authSuccessCount >= 2) return true;
          await new Promise((r) => setTimeout(r, 1000));
        }
        return false;
      })(),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), reconnectTimeout)),
    ]);

    // Wait for DPoP re-activation after reconnect
    if (reconnected) {
      await new Promise((r) => setTimeout(r, 5000));
    }

    const reconnectResult = await page.evaluate(() => {
      const totalCalls = (window as any).__getAuthCount() as number;
      const fingerprints = (window as any).__getFingerprints() as string[];
      return { totalAuthenticateCalls: totalCalls, fingerprints };
    });

    // Collect diagnostics for failure messages
    const dpopLogs = consoleLogs.filter(
      (log) =>
        log.includes('DPoP') ||
        log.includes('DeviceToken') ||
        log.includes('Client Bound') ||
        log.includes('Re-authenticat') ||
        log.includes('Authentication RPC failed') ||
        log.includes('Authentication completed') ||
        log.includes('Credential expired') ||
        log.includes('reconnect')
    );
    const diagnostics = `\nRelevant logs:\n${dpopLogs.join('\n')}\n`;

    expect(
      reconnected,
      `SDK should have reconnected and re-authenticated after going back online.${diagnostics}`
    ).toBe(true);

    // Verify session continuity: authorization_state reconnect should preserve the session
    // (credential provider is NOT called again — the stored expired SAT + authorization_state is used)
    const reconnectUsedAuthState = consoleLogs.some((log) =>
      log.includes('Reconnecting with stored jwt_token + authorization_state')
    );
    expect(
      reconnectUsedAuthState,
      `SDK should have attempted reconnect with stored jwt_token + authorization_state.${diagnostics}`
    ).toBe(true);

    // Verify the same DPoP fingerprint was reused (key pair must NOT be regenerated)
    const fingerprints = reconnectResult.fingerprints ?? [];
    if (fingerprints.length >= 2) {
      expect(
        fingerprints[fingerprints.length - 1],
        'DPoP fingerprint must be reused across reconnects — regenerating breaks server-side token binding'
      ).toBe(fingerprints[0]);
    }

    // Verify DPoP re-activation was attempted after reconnect
    const activationAttempted = consoleLogs.filter((log) =>
      log.includes('Client Bound SAT activated successfully') ||
      log.includes('Failed to activate Client Bound SAT')
    ).length;

    expect(
      activationAttempted,
      `Client Bound SAT activation should have been attempted twice (initial + reconnect), got ${activationAttempted}.${diagnostics}`
    ).toBeGreaterThanOrEqual(2);
  });
});
