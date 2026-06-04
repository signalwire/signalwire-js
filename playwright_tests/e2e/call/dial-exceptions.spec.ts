/**
 * dial() Exceptions — E2E Test Suite
 *
 * Tests every exception condition that can occur during call setup.
 * Each test targets a single error path to pinpoint exactly which
 * condition broke and why.
 *
 * Observable waits use `window.__waitFor(obs$, predicate, timeout, label)`
 * which auto-unsubscribes after the first matching value — no subscription leaks.
 */
import { test, expect, createSATToken } from '../fixtures';
import { gotoTestPage, setupClient, roomId } from '../helpers/setup';

const CALL_CONNECT_TIMEOUT = 30_000;

/**
 * A structurally valid JWT whose signature does NOT match any real SignalWire
 * signing key. Header: {"alg":"HS256","typ":"JWT"}, payload: {"sub":"1234567890"}
 */
const FAKE_JWT_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

test.describe('dial() Exceptions', () => {
  test.afterEach(async ({ page }) => {
    await page
      .evaluate(async () => {
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

  // ── Test 1: dial() to a non-existent destination ──────────────────────────

  test('invalid destination — call reaches failed or disconnected status', async ({
    page,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupClient(page);

    // ── CHECK ──────────────────────────────────────────────
    // No video room is created — the destination intentionally does not exist.
    const dest = `/public/nonexistent-room-${roomId()}`;

    const result = await page.evaluate(
      async ({ dest, connectTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          // Collect structured errors$ emissions before dialing
          const collectedErrors: Array<{
            kind: string;
            fatal: boolean;
            message: string;
            callId: string;
          }> = [];
          let errorsSub: { unsubscribe(): void } | null = null;

          const call = await window.__swClient.dial(dest);
          window.__swCall = call;

          // Subscribe to errors$ immediately after dial returns
          errorsSub = call.errors$.subscribe((e: unknown) => {
            const err = e as Record<string, unknown>;
            collectedErrors.push({
              kind: String(err.kind ?? ''),
              fatal: Boolean(err.fatal),
              message: err.error instanceof Error ? err.error.message : String(err.error ?? ''),
              callId: String(err.callId ?? ''),
            });
          });

          // Wait for the call to reach a terminal error state
          const finalStatus = await waitFor(
            call.status$,
            (s) => s === 'failed' || s === 'disconnected' || s === 'destroyed',
            connectTimeout,
            'status$ → failed/disconnected/destroyed for non-existent destination'
          );

          errorsSub.unsubscribe();

          return {
            success: true,
            finalStatus,
            errorCount: collectedErrors.length,
            errors: collectedErrors,
          };
        } catch (error) {
          // dial() itself may throw — that is also a valid error path
          return {
            success: false,
            threw: true,
            error: String(error),
          };
        }
      },
      { dest, connectTimeout: CALL_CONNECT_TIMEOUT }
    );

    if (result.threw) {
      // dial() rejected — acceptable error path
      expect(result.error, 'dial() error message is non-empty').toBeTruthy();
    } else {
      expect(
        result.success,
        'dial() completes without throwing'
      ).toBe(true);
      expect(
        result.finalStatus,
        'call to non-existent destination reaches failed, disconnected, or destroyed'
      ).toMatch(/^(failed|disconnected|destroyed)$/);

      // errors$ should emit at least one CallError for the failed call
      expect(
        result.errorCount,
        'errors$ emits at least one CallError'
      ).toBeGreaterThanOrEqual(1);

      const firstError = result.errors![0];
      expect(
        firstError.kind,
        'CallError.kind is a valid error category'
      ).toMatch(/^(media|signaling|timeout|rejected|network|internal)$/);
      expect(
        firstError.fatal,
        'CallError.fatal is true for a terminal failure'
      ).toBe(true);
      expect(
        firstError.message,
        'CallError.error.message is non-empty'
      ).toBeTruthy();
      expect(
        firstError.callId,
        'CallError.callId is a non-empty string'
      ).toBeTruthy();
    }
  });

  // ── Test 2b: errors$ emits a CallError when destination is unreachable ──────
  //
  // NOTE: The SDK may route this error exclusively through status$ transitions
  // and NOT emit on errors$, depending on how the server rejects the call.
  // This test is skipped until the SDK guarantees errors$ emission for
  // server-rejected destinations. When the SDK does emit on errors$, the
  // emitted value must carry a valid CallError.kind field.

  test('errors$ observable — emits a CallError when destination is unreachable', async ({
    page,
  }) => {
    test.skip(true, [
      'The SDK may not emit on errors$ for server-rejected destinations.',
      'The server rejection is currently surfaced only via status$ transitions',
      '(failed/disconnected/destroyed). Enable this test once the SDK guarantees',
      'errors$ emission for unreachable-destination errors.',
    ].join(' '));

    // ── SETUP ──────────────────────────────────────────────
    await setupClient(page);

    // ── CHECK ──────────────────────────────────────────────
    const dest = `/public/no-such-room-${roomId()}`;

    const result = await page.evaluate(
      async ({ dest, connectTimeout }) => {
        const waitFor = window.__waitFor;

        const subHolder: { current: { unsubscribe(): void } | null } = { current: null };

        try {
          const call = await window.__swClient.dial(dest);
          window.__swCall = call;

          // Subscribe to errors$ right after dial() returns so we don't miss fast emissions.
          const errorsPromise = new Promise<unknown>((resolve) => {
            subHolder.current = call.errors$.subscribe((e: unknown) => {
              resolve(e);
            });
          });

          // Race errors$ against a terminal status — here we specifically want errors$.
          const statusPromise = waitFor(
            call.status$,
            (s) => s === 'failed' || s === 'disconnected' || s === 'destroyed',
            connectTimeout,
            'status$ → failed/disconnected/destroyed'
          );

          const winner = await Promise.race([
            errorsPromise.then((e) => ({ kind: 'error' as const, value: e })),
            statusPromise.then((s) => ({ kind: 'status' as const, value: s })),
          ]);

          if (subHolder.current) subHolder.current.unsubscribe();

          if (winner.kind === 'error') {
            const err = winner.value as Record<string, unknown>;
            return {
              success: true,
              receivedError: true,
              errorKind: typeof err?.kind === 'string' ? err.kind : null,
              errorStr: String(winner.value),
              finalStatus: call.status,
            };
          } else {
            return {
              success: true,
              receivedError: false,
              errorKind: null,
              errorStr: null,
              finalStatus: winner.value,
            };
          }
        } catch (dialError) {
          if (subHolder.current) subHolder.current.unsubscribe();
          return {
            success: false,
            threw: true,
            error: String(dialError),
          };
        }
      },
      { dest, connectTimeout: CALL_CONNECT_TIMEOUT }
    );

    if ((result as { threw?: boolean }).threw) {
      // dial() rejecting is also a valid error signal
      expect(
        (result as { error?: string }).error,
        'dial() error message is non-empty'
      ).toBeTruthy();
    } else {
      expect(
        result.success,
        'evaluate block completes successfully'
      ).toBe(true);

      expect(
        result.receivedError,
        'errors$ emits a CallError for an unreachable destination'
      ).toBe(true);

      if (result.receivedError) {
        expect(result.errorKind, 'errors$ emits CallError with valid kind').toBeTruthy();
        expect(result.errorKind).toMatch(/^(signaling|network|rejected|timeout|internal|media)$/);
      }
    }
  });

  // ── Test 3: dial() before client is connected (skipConnection mode) ────────

  test('not connected — dial() should reject or timeout when client skips connection', async ({
    page,
  }) => {
    // dial() hangs waiting for authentication (~10s timeout race), plus setup overhead
    test.setTimeout(60_000);

    // ── SETUP ──────────────────────────────────────────────
    const token = await createSATToken();
    expect(token, 'SAT token created').toBeTruthy();

    await gotoTestPage(page);

    // ── CHECK ──────────────────────────────────────────────
    // Create a client with skipConnection: true so it never establishes a
    // WebSocket session. dial() must then fail or time out rather than succeed.
    const result = await page.evaluate(
      async ({ token }) => {
        const waitFor = window.__waitFor;
        try {
          const provider = new window.StaticCredentialProvider({ token });

          // Cast to any to pass the second options argument — the browser bundle
          // accepts it even though the minimal type declaration omits it.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = new (window.SignalWire as any)(provider, {
            skipConnection: true,
            logLevel: 'debug',
          });
          window.__swClient = client;

          // isConnected$ should never become true because we skipped connection.
          let isConnectedNow = false;
          try {
            await waitFor(
              client.isConnected$,
              (c: boolean) => c === true,
              3000,
              'isConnected$ → true (should NOT happen)'
            );
            isConnectedNow = true;
          } catch {
            // Expected: waitFor timed out because skipConnection prevents connection.
          }

          if (isConnectedNow) {
            // Unexpectedly connected — dial and see
            return { success: false, error: 'Client connected despite skipConnection: true' };
          }

          // Now attempt to dial — this should reject because the session is not
          // authenticated (waitAuthentication inside dial() waits on ready$ which
          // requires isConnected + authenticated, which can never happen here).
          const DIAL_TIMEOUT_MS = 10000;
          let dialThrew = false;
          let dialError = '';
          try {
            const call = await Promise.race([
              client.dial('/public/test-room'),
              new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error(`dial() timed out after ${DIAL_TIMEOUT_MS}ms — client not connected`)),
                  DIAL_TIMEOUT_MS
                )
              ),
            ]);
            window.__swCall = call;
          } catch (e) {
            dialThrew = true;
            dialError = String(e);
          }

          return {
            success: true,
            dialThrew,
            dialError,
            wasConnected: false,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { token }
    );

    expect(
      result.success,
      'evaluate block completes successfully'
    ).toBe(true);

    expect(
      result.dialThrew,
      'dial() throws or times out when client has not connected'
    ).toBe(true);

    expect(
      result.dialError,
      'dial() error message is non-empty'
    ).toBeTruthy();
  });

  // ── Test 4: dial() with an invalid SAT token ─────────────────────────────

  test('invalid token — client should fail to connect with a fake JWT', async ({
    page,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await gotoTestPage(page);

    // ── CHECK ──────────────────────────────────────────────
    // Use a structurally valid JWT with the wrong signing key.
    // The SDK should either throw InvalidCredentialsError in the constructor
    // (synchronously via validateCredentials) or fail to connect so that
    // isConnected$ never emits true.
    const result = await page.evaluate(
      async ({ fakeToken, connectTimeout }) => {
        const waitFor = window.__waitFor;
        let constructorThrew = false;
        let constructorError = '';
        let client: typeof window.__swClient | null = null;

        try {
          const provider = new window.StaticCredentialProvider({ token: fakeToken });
          client = new window.SignalWire(provider, { logLevel: 'debug' });
          window.__swClient = client;
        } catch (e) {
          constructorThrew = true;
          constructorError = String(e);
        }

        if (constructorThrew) {
          return {
            success: true,
            constructorThrew: true,
            constructorError,
            everConnected: false,
          };
        }

        // Constructor did not throw synchronously — wait to see if it ever connects.
        // A real invalid token is rejected by the server, so isConnected$
        // should never become true within a reasonable window.
        const WAIT_MS = Math.min(connectTimeout, 15000);
        let everConnected = false;
        try {
          await waitFor(client!.isConnected$, (c) => c === true, WAIT_MS, 'isConnected$ → true');
          everConnected = true;
        } catch {
          // Expected: waitFor timed out because invalid token prevents connection.
        }

        return {
          success: true,
          constructorThrew: false,
          constructorError: '',
          everConnected,
        };
      },
      { fakeToken: FAKE_JWT_TOKEN, connectTimeout: CALL_CONNECT_TIMEOUT }
    );

    expect(
      result.success,
      'evaluate block completes successfully'
    ).toBe(true);

    if (result.constructorThrew) {
      // SDK detected the invalid token during construction — ideal fast-fail path.
      expect(
        result.constructorError,
        'constructor error message is non-empty'
      ).toBeTruthy();
    } else {
      // Constructor accepted the token but the connection should never succeed.
      expect(
        result.everConnected,
        'client with fake JWT never reaches isConnected$ = true'
      ).toBe(false);
    }
  });
});
