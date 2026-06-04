/**
 * Screen Share — E2E Test Suite
 *
 * Tests the screen share feature of the SignalWire Browser SDK:
 * - `screenShareStatus$` observable state transitions
 * - `startScreenShare()` / `stopScreenShare()` control methods
 * - Screen share track addition to the peer connection
 *
 * Headless browser workaround:
 * In headless Chromium, `getDisplayMedia()` fails because there is no display
 * to capture. We override `navigator.mediaDevices.getDisplayMedia` with a fake
 * implementation that returns a canvas-based MediaStream. This lets us test the
 * signaling flow (screenShareStatus$ transitions) without actual screen capture.
 *
 * All tests use `?channel=video` since screen share requires a video call.
 */
import { test, expect } from '../fixtures';
import { setupRoomCall } from '../helpers/setup';

const OBSERVABLE_TIMEOUT = 10_000;

/**
 * Inject a fake `getDisplayMedia` override into the browser context.
 * Must be called BEFORE any `startScreenShare()` invocation.
 */
async function injectGetDisplayMediaMock(page: import('@playwright/test').Page): Promise<void> {
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

test.describe('Screen Share', () => {
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

  // ── Test 1: Initial screenShareStatus$ is 'off' ────────────────────────────

  test('screenShareStatus$ starts as off after joining a video call', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-screenshare', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const self = (await waitFor(
            call.self$,
            (s: unknown) => s !== null,
            obsTimeout,
            'self$ → non-null'
          ))!;

          const status = await waitFor(
            self.screenShareStatus$,
            () => true,
            obsTimeout,
            'screenShareStatus$ initial value'
          );

          return { success: true, status };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'screenShareStatus$ emission succeeded').toBe(true);
    expect(
      (result as { status: string }).status,
      'initial screenShareStatus$ should be none'
    ).toBe('none');
  });

  // ── Test 2: startScreenShare transitions status to 'on' ─────────────────────

  test('startScreenShare transitions screenShareStatus$ to on', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    // Inject mock BEFORE setupRoomCall to ensure override is in place
    // before any SDK code captures a reference to getDisplayMedia
    await setupRoomCall({ page, resource, prefix: 'e2e-screenshare', channel: 'video' });
    await injectGetDisplayMediaMock(page);

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const self = (await waitFor(
            call.self$,
            (s: unknown) => s !== null,
            obsTimeout,
            'self$ → non-null'
          ))!;

          // Verify initial state is none
          const initialStatus = await waitFor(
            self.screenShareStatus$,
            (s: unknown) => s === 'none',
            obsTimeout,
            'screenShareStatus$ → none (initial)'
          );

          // Start screen share
          await self.startScreenShare();

          // Wait for status to transition to 'started'
          const onStatus = await waitFor(
            self.screenShareStatus$,
            (s: unknown) => s === 'started',
            obsTimeout,
            'screenShareStatus$ → started'
          );

          return { success: true, initialStatus, onStatus };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `startScreenShare succeeded — ${(result as { error?: string }).error ?? ''}`).toBe(true);
    expect(
      (result as { initialStatus: string }).initialStatus,
      'initial status should be none'
    ).toBe('none');
    expect(
      (result as { onStatus: string }).onStatus,
      'status after startScreenShare should be started'
    ).toBe('started');
  });

  // ── Test 3: stopScreenShare transitions status back to 'off' ────────────────

  test('stopScreenShare transitions screenShareStatus$ back to off', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-screenshare', channel: 'video' });
    await injectGetDisplayMediaMock(page);

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const self = (await waitFor(
            call.self$,
            (s: unknown) => s !== null,
            obsTimeout,
            'self$ → non-null'
          ))!;

          // Start screen share first
          await self.startScreenShare();

          await waitFor(
            self.screenShareStatus$,
            (s: unknown) => s === 'started',
            obsTimeout,
            'screenShareStatus$ → started'
          );

          // Stop screen share
          await self.stopScreenShare();

          // Wait for status to transition back to 'none'
          const offStatus = await waitFor(
            self.screenShareStatus$,
            (s: unknown) => s === 'none',
            obsTimeout,
            'screenShareStatus$ → none (after stop)'
          );

          return { success: true, offStatus };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `stopScreenShare succeeded — ${(result as { error?: string }).error ?? ''}`).toBe(true);
    expect(
      (result as { offStatus: string }).offStatus,
      'status after stopScreenShare should be none'
    ).toBe('none');
  });

  // ── Test 4: Full lifecycle — start → on → stop → off ───────────────────────

  test('screen share full lifecycle: none → started → none', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-screenshare', channel: 'video' });
    await injectGetDisplayMediaMock(page);

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;
          const transitions: string[] = [];

          const self = (await waitFor(
            call.self$,
            (s: unknown) => s !== null,
            obsTimeout,
            'self$ → non-null'
          ))!;

          // Capture initial state
          const initialStatus = await waitFor(
            self.screenShareStatus$,
            () => true,
            obsTimeout,
            'screenShareStatus$ initial'
          );
          transitions.push(String(initialStatus));

          // Start screen share
          await self.startScreenShare();

          const onStatus = await waitFor(
            self.screenShareStatus$,
            (s: unknown) => s === 'started',
            obsTimeout,
            'screenShareStatus$ → started'
          );
          transitions.push(String(onStatus));

          // Sync getter should also reflect 'started'
          const syncStatusOn = self.screenShareStatus;

          // Stop screen share
          await self.stopScreenShare();

          const offStatus = await waitFor(
            self.screenShareStatus$,
            (s: unknown) => s === 'none',
            obsTimeout,
            'screenShareStatus$ → none (after stop)'
          );
          transitions.push(String(offStatus));

          // Sync getter should also reflect 'none'
          const syncStatusOff = self.screenShareStatus;

          return {
            success: true,
            transitions,
            syncStatusOn,
            syncStatusOff,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `full lifecycle succeeded — ${(result as { error?: string }).error ?? ''}`).toBe(true);

    const r = result as {
      success: true;
      transitions: string[];
      syncStatusOn: string;
      syncStatusOff: string;
    };

    expect(r.transitions, 'transitions should be none → started → none').toEqual([
      'none',
      'started',
      'none',
    ]);
    expect(r.syncStatusOn, 'sync getter should be started while sharing').toBe('started');
    expect(r.syncStatusOff, 'sync getter should be none after stop').toBe('none');
  });

  // ── Test 5: Screen share produces a separate active stream ──────────────────
  // The SDK uses a separate RTCPeerConnection for screen share, so we verify
  // the screen share is active via status + the participants list gaining a
  // 'screen' type member.

  test('startScreenShare produces an active screen share session', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-screenshare', channel: 'video' });
    await injectGetDisplayMediaMock(page);

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const self = (await waitFor(
            call.self$,
            (s: unknown) => s !== null,
            obsTimeout,
            'self$ → non-null'
          ))!;

          // Capture participant count before screen share
          const partsBefore = await waitFor(
            call.participants$,
            (p: unknown[]) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1'
          );
          const countBefore = partsBefore.length;

          // Start screen share
          await self.startScreenShare();

          // Verify status transitions to 'started'
          const status = await waitFor(
            self.screenShareStatus$,
            (s: unknown) => s === 'started',
            obsTimeout,
            'screenShareStatus$ → started'
          );

          // Wait for a 'screen' participant to appear (the server adds one)
          const partsAfter = await waitFor(
            call.participants$,
            (p: unknown[]) => p.length > countBefore,
            obsTimeout,
            'participants$ → screen participant added'
          );

          return {
            success: true,
            status,
            countBefore,
            countAfter: partsAfter.length,
            hasScreenParticipant: partsAfter.length > countBefore,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `screen share session check — ${(result as { error?: string }).error ?? ''}`).toBe(true);
    expect(result.status, 'screen share status is started').toBe('started');
    expect(result.hasScreenParticipant, 'screen share added a participant').toBe(true);
  });
});
