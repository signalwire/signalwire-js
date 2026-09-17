/**
 * Reattach after a screen share — E2E Test Suite
 *
 * A screen share adds a second (auxiliary) leg to an existing call. These tests
 * cover the attach bookkeeping that leg leaves behind, in the two states a
 * reload can find it in:
 *
 * - The share was stopped first: reloading must reattach the one call that is
 *   still up, and nothing else.
 * - The share was still running: the call reattaches, and once it is hung up
 *   nothing may be left for a later reload to reattach.
 *
 * Both walk the same path as `call-continuity.spec.ts`'s reattach tests — the
 * attach records and `authorization_state` live in sessionStorage, so the reload
 * navigates same-origin to preserve them, and the reloaded client gets a
 * refresh-capable provider so a stale credential heals instead of costing the
 * attachment.
 */
import type { Page } from '@playwright/test';
import { test, expect, createSATToken } from '../fixtures';
import { setupRoomCall, gotoTestPage } from '../helpers/setup';

// ── Timeout constants ─────────────────────────────────────────────────────────

/** Observable checks on an already-connected call. */
const OBSERVABLE_TIMEOUT = 10_000;

/** Waiting on the reattached call to appear after a reload. */
const REATTACH_TIMEOUT = 30_000;

/** Client connect after a reload. */
const CLIENT_CONNECT_TIMEOUT = 15_000;

/** Settle time between the navigation away and back. */
const NAVIGATION_SETTLE_MS = 500;

/**
 * How long to watch an idle session for a call that must never arrive.
 * Covers the reattach's own three attempts and their backoff (1s + 2s + 3s)
 * with room to spare, so "no call appeared" means it was never attempted
 * rather than that we stopped watching too early.
 */
const GHOST_WATCH_MS = 20_000;

/** Settle time for extra `calls$` emissions after the awaited one. */
const CALLS_SETTLE_MS = 3_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Inject a fake `getDisplayMedia` override into the browser context.
 * Headless Chromium has no capturable surface, so the real one rejects; a
 * canvas-backed stream exercises the same signaling path.
 *
 * Must be called after every navigation — the override lives on the document.
 */
async function injectGetDisplayMediaMock(page: Page): Promise<void> {
  await page.evaluate(() => {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 640, 480);
      }
      return canvas.captureStream(30);
    };
  });
}

/** Navigate away and back, same-origin, so sessionStorage survives. */
async function reloadTestPage(page: Page): Promise<void> {
  await page.goto(`${page.url().split('/e2e')[0]}/`);
  await page.waitForTimeout(NAVIGATION_SETTLE_MS);
  await gotoTestPage(page);
}

/**
 * The call ids the SDK is currently holding a reattach reference for.
 * They live in sessionStorage under `sw:<userId>:att` — read straight from
 * storage so the check is independent of the SDK objects that consume them.
 */
async function readAttachedCallIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const key = Object.keys(sessionStorage).find((k) => k.endsWith(':att'));
    if (!key) return [];
    return Object.keys(JSON.parse(sessionStorage.getItem(key) ?? '{}'));
  });
}

/**
 * Build a fresh client on the reloaded page with reattach enabled, and start
 * collecting `errors$` so a failed reattach is visible to the assertions.
 */
async function initReattachingClient(page: Page): Promise<void> {
  const token = await createSATToken();
  expect(token, 'Setup failed: Could not create SAT token for the reload').toBeTruthy();

  await page.evaluate(
    async ({ token, connTimeout }) => {
      const provider = {
        authenticate: async () => ({ token }),
        refresh: async () => ({ token: await window.__mintSat() }),
      };
      const client = new window.SignalWire(provider, {
        logLevel: 'debug',
        debug: { logWsTraffic: true },
        reconnectAttachedCalls: true,
      });
      window.__swClient = client;
      window.__transportErrors = [];
      client.errors$.subscribe((error: unknown) => {
        window.__transportErrors.push(String(error));
      });
      await window.__waitFor(
        client.isConnected$,
        (c) => c === true,
        connTimeout,
        'Client isConnected$ after reload'
      );
    },
    { token, connTimeout: CLIENT_CONNECT_TIMEOUT }
  );
}

/**
 * Join a video room and start sharing the screen. The share is left running.
 *
 * @returns the id of the call the share was started on.
 */
async function joinAndStartScreenShare(
  page: Page,
  resource: { createVideoRoom: (name: string) => Promise<{ id: string }> },
  prefix: string
): Promise<string> {
  await setupRoomCall({
    page,
    resource,
    prefix,
    channel: 'video',
    clientOptions: { reconnectAttachedCalls: true },
  });
  await injectGetDisplayMediaMock(page);

  const result = await page.evaluate(
    async ({ obsTimeout }) => {
      const waitFor = window.__waitFor;
      try {
        const call = window.__swCall;

        const self = (await waitFor(
          call.self$,
          (s: unknown) => s !== null,
          obsTimeout,
          'call.self$ → non-null (call.joined received)'
        ))!;

        await self.startScreenShare();
        await waitFor(
          self.screenShareStatus$,
          (s: unknown) => s === 'started',
          obsTimeout,
          'self.screenShareStatus$ → started'
        );

        return { success: true, callId: call.id };
      } catch (error) {
        return { success: false, error: String(error), callId: '' };
      }
    },
    { obsTimeout: OBSERVABLE_TIMEOUT }
  );

  expect(
    result.success,
    `Setup failed: startScreenShare() threw — ${result.success ? '' : result.error}`
  ).toBe(true);

  return result.callId;
}

/** Stop the running screen share and wait for the status to settle back. */
async function stopScreenShare(page: Page): Promise<void> {
  const result = await page.evaluate(
    async ({ obsTimeout }) => {
      const waitFor = window.__waitFor;
      try {
        const call = window.__swCall;
        const self = call.self!;

        await self.stopScreenShare();
        await waitFor(
          self.screenShareStatus$,
          (s: unknown) => s === 'none',
          obsTimeout,
          'self.screenShareStatus$ → none (after stop)'
        );

        return { success: true, status: call.status };
      } catch (error) {
        return { success: false, error: String(error), status: '' };
      }
    },
    { obsTimeout: OBSERVABLE_TIMEOUT }
  );

  expect(
    result.success,
    `Setup failed: stopScreenShare() threw — ${result.success ? '' : result.error}`
  ).toBe(true);
  expect(
    result.status,
    'Setup failed: the call did not survive the screen share cycle'
  ).toBe('connected');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Reattach after a screen share', () => {
  test.afterEach(async ({ page }) => {
    await page
      .evaluate(async () => {
        try {
          for (const call of window.__swClient?.session?.calls ?? []) {
            await call.hangup();
          }
        } catch {
          /* calls may already have ended */
        }
        try {
          if (window.__swClient) await window.__swClient.disconnect();
        } catch {
          /* client may already be disconnected */
        }
      })
      .catch(() => {});
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 1 — "Failed to Reattach"
  //
  // Dial → start screen share → stop screen share → reload. The screen share
  // is over and its leg is gone; the call it was shared on is still up, so the
  // reload must bring back that one call and attempt nothing else.
  // ─────────────────────────────────────────────────────────────────────────

  test('reload after a screen share cycle — reattaches the call and nothing else', async ({
    page,
    resource,
  }) => {
    test.setTimeout(120_000);

    // ── SETUP ──────────────────────────────────────────────────────────────
    await page.exposeFunction('__mintSat', async () => createSATToken());
    const originalCallId = await joinAndStartScreenShare(page, resource, 'e2e-ra-ss-cycle');
    await stopScreenShare(page);

    // The screen-share leg is gone, so the only call left to reattach is the
    // one it was shared on. A second reference here is an orphan, and every
    // reload from now on will spend a reattach attempt on a dead leg.
    const attachedAfterStop = await readAttachedCallIds(page);
    expect
      .soft(attachedAfterStop, 'Side effect: stopping the screen share left an extra attach reference')
      .toEqual([originalCallId]);

    // ── CHECK ──────────────────────────────────────────────────────────────
    await reloadTestPage(page);
    await initReattachingClient(page);

    const result = await page.evaluate(
      async ({ timeout, settleMs, originalCallId }) => {
        const client = window.__swClient;
        try {
          const calls = await window.__waitFor(
            client.session.calls$,
            (c: { id: string }[]) => c.some((call) => call.id === originalCallId),
            timeout,
            'client.session.calls$ → holds the original call'
          );
          window.__swCall = calls.find(
            (c: { id: string }) => c.id === originalCallId
          ) as typeof window.__swCall;

          // Let any further reattach land before counting what came back.
          await new Promise((r) => setTimeout(r, settleMs));

          return {
            success: true,
            callIds: client.session.calls.map((c) => c.id),
            errors: window.__transportErrors,
          };
        } catch (error) {
          return {
            success: false,
            error: String(error),
            callIds: client.session.calls.map((c) => c.id),
            errors: window.__transportErrors,
          };
        }
      },
      { timeout: REATTACH_TIMEOUT, settleMs: CALLS_SETTLE_MS, originalCallId }
    );

    expect(
      result.success,
      `reattach did not restore call "${originalCallId}" — ${result.success ? '' : result.error}; ` +
        `session holds [${result.callIds.join(', ')}]`
    ).toBe(true);

    expect
      .soft(
        result.errors,
        'Side effect: the reattach reported an error on a call that was already back'
      )
      .toEqual([]);

    expect(
      result.callIds,
      'Side effect: the reload did not bring back exactly the one call that was up'
    ).toEqual([originalCallId]);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Test 2 — "Failed to Detach"
  //
  // The reported sequence: reload with the screen share still RUNNING, let the
  // call reattach, hang the call up, reload again. The share ended with the
  // call, and the call has been hung up, so the second reload has nothing left
  // to reattach and must dial nothing.
  //
  // Reloading mid-share is the case that matters: the leg was never bye'd, so
  // its session is still alive server-side and a reattach of it can actually
  // succeed — which a leg that had already been stopped could never do.
  // ─────────────────────────────────────────────────────────────────────────

  test('hangup after reattach — the next reload attempts no reattach', async ({
    page,
    resource,
  }) => {
    test.setTimeout(180_000);

    // ── SETUP: a call with a live screen share, then a reload ──────────────
    await page.exposeFunction('__mintSat', async () => createSATToken());
    const originalCallId = await joinAndStartScreenShare(page, resource, 'e2e-ra-ss-ghost');

    // Named for the assertions below: the record that is not the call's is the
    // screen-share leg's, and it is the one that must not outlive the call.
    const attachedWhileSharing = await readAttachedCallIds(page);
    const screenShareLegId = attachedWhileSharing.find((id) => id !== originalCallId);

    await reloadTestPage(page);
    await initReattachingClient(page);

    const reattached = await page.evaluate(
      async ({ timeout, settleMs, originalCallId }) => {
        const client = window.__swClient;
        try {
          const calls = await window.__waitFor(
            client.session.calls$,
            (c: { id: string }[]) => c.some((call) => call.id === originalCallId),
            timeout,
            'client.session.calls$ → holds the original call'
          );
          window.__swCall = calls.find(
            (c: { id: string }) => c.id === originalCallId
          ) as typeof window.__swCall;

          // Let the rest of the reattach land before counting what came back.
          await new Promise((r) => setTimeout(r, settleMs));

          return { success: true, callIds: client.session.calls.map((c) => c.id) };
        } catch (error) {
          return {
            success: false,
            error: String(error),
            callIds: client.session.calls.map((c) => c.id),
          };
        }
      },
      { timeout: REATTACH_TIMEOUT, settleMs: CALLS_SETTLE_MS, originalCallId }
    );

    expect(
      reattached.success,
      `Setup failed: the call never came back, so there is nothing to hang up — ${
        reattached.success ? '' : reattached.error
      }`
    ).toBe(true);

    // The share cannot survive a reload — `getDisplayMedia()` needs a fresh user
    // gesture the SDK never asks for — so the leg must not come back as a call.
    expect
      .soft(
        reattached.callIds,
        'Side effect: the reload brought back more than the call that was up'
      )
      .toEqual([originalCallId]);

    // ── CHECK: hang up the call, the way the user does ─────────────────────
    // Only the call they dialled: an app renders that one, so that is the one
    // its hangup button ends. Anything the SDK reattached behind it is not
    // reachable from the UI.
    const hangupResult = await page.evaluate(
      async ({ obsTimeout }) => {
        const client = window.__swClient;
        try {
          const call = window.__swCall;
          const ended = window.__waitFor(
            call.status$,
            (s: string) => s === 'disconnected' || s === 'destroyed',
            obsTimeout,
            'call.status$ → ended after hangup'
          );
          await call.hangup();
          await ended;
          return { success: true, remaining: client.session.calls.map((c) => c.id) };
        } catch (error) {
          return { success: false, error: String(error), remaining: [] as string[] };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(
      hangupResult.success,
      `hangup() threw — ${hangupResult.success ? '' : hangupResult.error}`
    ).toBe(true);

    // The call is over, and the share went with it. Nothing may be left.
    const attachedAfterHangup = await readAttachedCallIds(page);
    expect
      .soft(
        attachedAfterHangup,
        `Unexpected result: hanging up left a reattach reference behind (screen-share leg ${screenShareLegId})`
      )
      .toEqual([]);

    // ── CHECK: the reload must dial nothing ────────────────────────────────
    // Watch the wire, not just `calls$`: whether the server accepts or refuses
    // the invite is its call, but sending one at all is the defect. WS traffic
    // is logged at debug level, so an outbound frame shows up on the console.
    const sentInvites: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('SEND:') && text.includes('verto.invite')) {
        sentInvites.push(text);
      }
    });

    await reloadTestPage(page);
    await initReattachingClient(page);

    const ghost = await page.evaluate(
      async ({ watchMs }) => {
        const client = window.__swClient;
        const seen: string[] = [];
        const sub = client.session.calls$.subscribe((calls: { id: string }[]) => {
          for (const call of calls) {
            if (!seen.includes(call.id)) seen.push(call.id);
          }
        });
        await new Promise((r) => setTimeout(r, watchMs));
        sub.unsubscribe();
        return { seen };
      },
      { watchMs: GHOST_WATCH_MS }
    );

    expect
      .soft(
        sentInvites.length,
        `Unexpected result: ${sentInvites.length} verto.invite(s) went out after a reload with no call to reattach to`
      )
      .toBe(0);

    expect(
      ghost.seen,
      'Unexpected result: a call was dialled after a reload with no call to reattach to'
    ).toEqual([]);
  });
});
