/**
 * Server-Pushed Media Params — E2E Regression Suite
 *
 * The server pushes `verto.mediaParams` to each leg ~0.4–1.5 s after it
 * connects. Regression guards for two fixed defects:
 *
 * - T1 (cloud-product#20524) an application-supplied Web Audio track reports a
 *   `deviceId` no `getUserMedia` can satisfy, and used to be stopped and lost.
 * - T2 (cloud-product#20523) that failure used to be classified fatal, killing
 *   the whole call over an auxiliary leg.
 * - T3 control: a real device microphone still gets the pushed params applied.
 *   Guards against a "fix" that disables the feature wholesale.
 *
 * The push is server-timed, so every wait is a deadline over observed evidence
 * — the `verto.mediaParams` frame in the browser console, which
 * `initializeClient` surfaces via `debug: { logWsTraffic: true }` — never a
 * fixed sleep.
 */
import { test, expect } from '../fixtures';
import type { ConsoleMessage, Page } from '@playwright/test';
import { setupRoomCall, setupRoomClient } from '../helpers/setup';

const MEDIA_PARAMS_METHOD = 'verto.mediaParams';

/** Max time to wait for the server to push `verto.mediaParams` to a new leg. */
const MEDIA_PARAMS_PUSH_DEADLINE = 20_000;

const PUSH_POLL_INTERVAL = 250;

/** Grace for the async `vertoMediaParams$` handler to settle before asserting. */
const HANDLER_SETTLE_MS = 2_000;

const OBSERVABLE_TIMEOUT = 10_000;

/** Timeout for the in-page dial + connect used by the control test. */
const DIAL_TIMEOUT = 30_000;

/**
 * Per-test timeout: room + SAT + dial setup, plus the server-timed push
 * deadline and the handler settle window, exceed Playwright's 30 s default.
 */
const TEST_TIMEOUT = 90_000;

const TONE_FREQUENCY_HZ = 440;

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MediaParamsFrameCounter {
  /** How many `verto.mediaParams` frames have been logged so far. */
  count: () => number;
}

/**
 * Attach BEFORE navigating: a leg's push can land before any in-page
 * subscription exists.
 */
function countMediaParamsFrames(page: Page): MediaParamsFrameCounter {
  let frames = 0;
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.text().includes(MEDIA_PARAMS_METHOD)) {
      frames += 1;
    }
  });
  return { count: () => frames };
}

/** @returns `true` when a new frame was seen — the precondition for every assertion. */
async function waitForMediaParamsPush(
  page: Page,
  counter: MediaParamsFrameCounter,
  baseline: number,
  deadlineMs: number
): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < deadlineMs) {
    if (counter.count() > baseline) return true;
    await page.waitForTimeout(PUSH_POLL_INTERVAL);
  }
  return counter.count() > baseline;
}

/**
 * Subscribe to `call.status$` and `call.errors$` on `window.__swCall` and
 * collect every emission, mirroring `setupErrorListener` in `helpers/setup.ts`.
 *
 * Must run before the trigger: `call.errors$` only replays the latest error and
 * `status$` transitions are otherwise lost.
 */
async function collectCallStateEmissions(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    try {
      const call = window.__swCall;
      const w = window as unknown as {
        __statusHistory: string[];
        __callErrors: CollectedCallErrorInPage[];
      };
      w.__statusHistory = [];
      w.__callErrors = [];

      call.status$.subscribe((status) => {
        w.__statusHistory.push(String(status));
      });
      call.errors$.subscribe((callError) => {
        w.__callErrors.push({
          kind: String(callError.kind),
          fatal: Boolean(callError.fatal),
          name: String(callError.error?.name ?? ''),
          message: String(callError.error?.message ?? ''),
        });
      });

      return { success: true, error: '' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  if (!result.success) {
    throw new Error(
      `Setup failed: call state collectors — ${result.error}`
    );
  }
}

/**
 * Shape used inside `page.evaluate` — declared separately because the browser
 * closure cannot reference the outer module's types by name at runtime.
 */
interface CollectedCallErrorInPage {
  kind: string;
  fatal: boolean;
  name: string;
  message: string;
}

/** Outcome of building the auxiliary leg with an application-supplied stream. */
interface AuxiliaryLegResult {
  success: boolean;
  /** `id` of the supplied Web Audio track. */
  trackId: string;
  /** `deviceId` the supplied track reports — a `WebAudio-<uuid>` value. */
  deviceId: string;
  /** `readyState` of the supplied track right after the leg connected. */
  readyStateAfterAdd: string;
  error: string;
}

/**
 * Build a 440 Hz Web Audio tone and hand it to `addAdditionalDevice` as
 * `inputAudioStream`, keeping the supplied track reachable on `window`.
 *
 * This is exactly the customer-reported trigger: an auxiliary leg whose audio
 * is application-supplied rather than device-acquired.
 */
async function addAuxiliaryLegWithSuppliedAudio(
  page: Page
): Promise<AuxiliaryLegResult> {
  return page.evaluate(
    async ({ obsTimeout, toneHz }) => {
      try {
        const call = window.__swCall;

        const self = (await window.__waitFor(
          call.self$,
          (s: unknown) => s !== null && s !== undefined,
          obsTimeout,
          'self$ → non-null'
        ))!;

        // Application-supplied audio: AudioContext → Oscillator →
        // MediaStreamAudioDestinationNode. The resulting track reports
        // deviceId "WebAudio-<uuid>", which getUserMedia can never satisfy.
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        oscillator.frequency.value = toneHz;
        const destination = audioContext.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();

        const inputAudioStream = destination.stream;
        const suppliedTrack = inputAudioStream.getAudioTracks()[0];

        const w = window as unknown as {
          __suppliedTrack: MediaStreamTrack;
          __suppliedAudioContext: AudioContext;
        };
        w.__suppliedTrack = suppliedTrack;
        w.__suppliedAudioContext = audioContext;

        await self.addAdditionalDevice({
          audio: false,
          video: false,
          inputAudioStream,
        });

        return {
          success: true,
          trackId: suppliedTrack.id,
          deviceId: String(suppliedTrack.getSettings().deviceId ?? ''),
          readyStateAfterAdd: String(suppliedTrack.readyState),
          error: '',
        };
      } catch (error) {
        return {
          success: false,
          trackId: '',
          deviceId: '',
          readyStateAfterAdd: '',
          error: String(error),
        };
      }
    },
    { obsTimeout: OBSERVABLE_TIMEOUT, toneHz: TONE_FREQUENCY_HZ }
  );
}

// ── Suite ────────────────────────────────────────────────────────────────────

test.describe('Server-Pushed Media Params', () => {
  test.afterEach(async ({ page }) => {
    await page
      .evaluate(async () => {
        try {
          const w = window as unknown as {
            __suppliedAudioContext?: AudioContext;
          };
          await w.__suppliedAudioContext?.close();
        } catch {
          /* audio context may not exist or already be closed */
        }
        try {
          if (window.__swCall) await window.__swCall.hangup();
        } catch {
          /* call may already be ended (or destroyed by the defect) */
        }
        try {
          if (window.__swClient) await window.__swClient.disconnect();
        } catch {
          /* client may already be disconnected */
        }
      })
      .catch(() => {});
  });

  // ── T1: mediaParams push must not stop an app-supplied audio track ─────────

  test('mediaParams push does not stop an application-supplied audio track', async ({
    page,
    resource,
  }) => {
    // Regression guard for cloud-product#20524 (fixed): an application-supplied
    // track must survive a server-pushed mediaParams update.
    test.setTimeout(TEST_TIMEOUT);

    // ── SETUP ──────────────────────────────────────────────
    // Count frames from before page load: the main leg gets its own push and
    // an in-page subscription could never see a frame that already landed.
    const frames = countMediaParamsFrames(page);

    await setupRoomCall({
      page,
      resource,
      prefix: 'e2e-mediaparams',
      channel: 'video',
    });

    const framesBeforeTrigger = frames.count();

    const added = await addAuxiliaryLegWithSuppliedAudio(page);
    expect(
      added.success,
      `addAdditionalDevice with a supplied audio stream succeeded — ${added.error}`
    ).toBe(true);
    expect(
      added.readyStateAfterAdd,
      `supplied audio track (deviceId "${added.deviceId}") is live once the auxiliary leg is connected`
    ).toBe('live');

    // ── CHECK ──────────────────────────────────────────────
    const pushed = await waitForMediaParamsPush(
      page,
      frames,
      framesBeforeTrigger,
      MEDIA_PARAMS_PUSH_DEADLINE
    );
    expect(
      pushed,
      'server pushed a verto.mediaParams frame after the auxiliary leg connected'
    ).toBe(true);

    await page.waitForTimeout(HANDLER_SETTLE_MS);

    const trackState = await page.evaluate(() => {
      const w = window as unknown as { __suppliedTrack?: MediaStreamTrack };
      const track = w.__suppliedTrack;
      return {
        readyState: track ? track.readyState : 'missing',
        deviceId: String(track?.getSettings().deviceId ?? ''),
      };
    });

    expect(
      trackState.readyState,
      `application-supplied audio track (deviceId "${trackState.deviceId}") survives the server-pushed mediaParams update`
    ).toBe('live');
  });

  // ── T2: an auxiliary-leg mediaParams failure must not destroy the call ─────

  test('failed mediaParams swap on an auxiliary leg does not destroy the call', async ({
    page,
    resource,
  }) => {
    // Regression guard for cloud-product#20523 (fixed): an auxiliary-leg media
    // failure must never destroy the call.
    test.setTimeout(TEST_TIMEOUT);

    // ── SETUP ──────────────────────────────────────────────
    const frames = countMediaParamsFrames(page);

    await setupRoomCall({
      page,
      resource,
      prefix: 'e2e-mediaparams',
      channel: 'video',
    });

    await collectCallStateEmissions(page);

    const framesBeforeTrigger = frames.count();

    const added = await addAuxiliaryLegWithSuppliedAudio(page);
    expect(
      added.success,
      `addAdditionalDevice with a supplied audio stream succeeded — ${added.error}`
    ).toBe(true);

    // ── CHECK ──────────────────────────────────────────────
    const pushed = await waitForMediaParamsPush(
      page,
      frames,
      framesBeforeTrigger,
      MEDIA_PARAMS_PUSH_DEADLINE
    );
    expect(
      pushed,
      'server pushed a verto.mediaParams frame after the auxiliary leg connected'
    ).toBe(true);

    await page.waitForTimeout(HANDLER_SETTLE_MS);

    const callState = await page.evaluate(() => {
      const w = window as unknown as {
        __statusHistory: string[];
        __callErrors: CollectedCallErrorInPage[];
      };
      return {
        statusHistory: w.__statusHistory,
        callErrors: w.__callErrors,
      };
    });

    expect(
      callState.statusHistory,
      'call never transitioned to failed after the auxiliary-leg mediaParams error'
    ).not.toContain('failed');
    expect(
      callState.statusHistory,
      'call never transitioned to destroyed after the auxiliary-leg mediaParams error'
    ).not.toContain('destroyed');
    expect(
      callState.callErrors.filter((e) => e.fatal),
      'an auxiliary-leg mediaParams failure is surfaced as non-fatal'
    ).toEqual([]);
  });

  // ── T3: control — a real device audio track still gets its params ──────────
  // Positive control: this path must keep succeeding, so a fix cannot simply
  // disable server-pushed media params.

  test('mediaParams push is applied to a real device audio track on the main leg', async ({
    page,
    resource,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    // ── SETUP ──────────────────────────────────────────────
    const frames = countMediaParamsFrames(page);

    const roomName = await setupRoomClient({
      page,
      resource,
      prefix: 'e2e-mediaparams-ctl',
    });

    // Dial in-page rather than via dialAndJoin so the collectors attach
    // immediately after dial() resolves — i.e. before the main leg connects
    // and therefore before the server can push its mediaParams.
    const dialed = await page.evaluate(
      async ({ destination, dialTimeout }) => {
        try {
          const client = window.__swClient;
          const call = await client.dial(destination);
          window.__swCall = call;

          const w = window as unknown as {
            __statusHistory: string[];
            __callErrors: CollectedCallErrorInPage[];
            __mediaParamsUpdates: number;
          };
          w.__statusHistory = [];
          w.__callErrors = [];
          w.__mediaParamsUpdates = 0;

          call.status$.subscribe((status) => {
            w.__statusHistory.push(String(status));
          });
          call.errors$.subscribe((callError) => {
            w.__callErrors.push({
              kind: String(callError.kind),
              fatal: Boolean(callError.fatal),
              name: String(callError.error?.name ?? ''),
              message: String(callError.error?.message ?? ''),
            });
          });
          call.mediaParamsUpdated$.subscribe(() => {
            w.__mediaParamsUpdates += 1;
          });

          await window.__waitFor(
            call.status$,
            (s: unknown) => s === 'connected',
            dialTimeout,
            'Call status$ → connected'
          );

          return { success: true, error: '' };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      {
        destination: `/public/${roomName}?channel=audio`,
        dialTimeout: DIAL_TIMEOUT,
      }
    );

    expect(
      dialed.success,
      `call connected to /public/${roomName}?channel=audio — ${dialed.error}`
    ).toBe(true);

    // ── CHECK ──────────────────────────────────────────────
    const pushed = await waitForMediaParamsPush(
      page,
      frames,
      0,
      MEDIA_PARAMS_PUSH_DEADLINE
    );
    expect(
      pushed,
      'server pushed a verto.mediaParams frame to the main leg'
    ).toBe(true);

    await page.waitForTimeout(HANDLER_SETTLE_MS);

    const mainLegState = await page.evaluate(
      async ({ obsTimeout }) => {
        const call = window.__swCall;
        const w = window as unknown as {
          __statusHistory: string[];
          __callErrors: CollectedCallErrorInPage[];
          __mediaParamsUpdates: number;
        };

        const localStream = await window.__waitFor(
          call.localStream$,
          (s: unknown) => s !== null && s !== undefined,
          obsTimeout,
          'localStream$ → non-null'
        );
        const audioTracks = (localStream as MediaStream).getAudioTracks();

        return {
          status: String(call.status),
          statusHistory: w.__statusHistory,
          callErrors: w.__callErrors,
          mediaParamsUpdates: w.__mediaParamsUpdates,
          audioTrackCount: audioTracks.length,
          audioReadyStates: audioTracks.map((t) => t.readyState),
        };
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(
      mainLegState.mediaParamsUpdates,
      'SDK applied the pushed params and emitted mediaParamsUpdated$'
    ).toBeGreaterThanOrEqual(1);
    expect(
      mainLegState.audioTrackCount,
      'main leg still has an audio track after the swap'
    ).toBeGreaterThanOrEqual(1);
    expect(
      mainLegState.audioReadyStates,
      'no main-leg audio track was left ended by the swap'
    ).not.toContain('ended');
    expect(
      mainLegState.status,
      'call is still connected after the main-leg mediaParams update'
    ).toBe('connected');
    expect(
      mainLegState.callErrors.filter((e) => e.fatal),
      'no fatal error emitted while applying the main-leg mediaParams update'
    ).toEqual([]);
  });
});
