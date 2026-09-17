/**
 * Additional Device — timeout bound and error shape — E2E Regression Suite
 *
 * Regression guard for cloud-product#20520, where `addAdditionalDevice` and
 * `startScreenShare` shared one bound sized for a human at a screen-share
 * picker, so a caller with no human in the loop waited ~50 s to learn it had to
 * fall back. Healthy completion is ~5 s.
 *
 * **T1 simulates the unservable case.** The reporter could not reproduce the
 * server-side silence either, and asks for the bound and error shape to be
 * fixed — that is what this pins. It withholds the ANSWER for the new leg
 * (gated on `window.__blockConnect`, set only once the main call is up), so the
 * leg acquires media normally and then never connects — the same terminal state
 * as an invite the server never serves. Acquisition is deliberately unbounded,
 * so blocking the connect is the only way to reach the bound.
 *
 * **T2 is real end to end** — a genuine leg fed an application-supplied Web
 * Audio stream. It observes the healthy connect interval against a deliberately
 * generous bound: the ~5 s figure is evidence for sizing the timeout, not a
 * defect, so no tight band is asserted.
 */
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { setupRoomCall } from '../helpers/setup';

declare global {
  interface Window {
    /** Test-only: when true, an answer is never applied, so a leg never connects. */
    __blockConnect?: boolean;
    /** Test-only: how many answers were withheld. */
    __blockedAnswers?: number;
  }
}

const OBSERVABLE_TIMEOUT = 15_000;

/**
 * The budget an `addAdditionalDevice` failure must respect. There is no human
 * in the loop, so a caller must learn it has to fall back well inside this.
 */
const DEVICE_FAILURE_BUDGET_MS = 20_000;

/** Generous upper bound for the healthy path — deliberately not a tight band. */
const HEALTHY_CONNECT_BUDGET_MS = 20_000;

/** Headroom past the old 50 s bound, so a regression is observed, not truncated by the runner. */
const T1_TEST_TIMEOUT_MS = 150_000;
const T2_TEST_TIMEOUT_MS = 90_000;

interface FailureProbeResult {
  success: boolean;
  error?: string;
  outcome?: string;
  elapsedMs?: number;
  errorName?: string;
  errorMessage?: string;
  /** Whether the thrown error carries a `cause` pointing at the failing leg. */
  hasCause?: boolean;
  hungGumCalls?: number;
  /** Everything the application saw on `client.errors$` during the wait. */
  clientErrors?: string[];
  callStatusAtSettle?: string;
}

interface TimingProbeResult {
  success: boolean;
  error?: string;
  outcome?: string;
  elapsedMs?: number;
  errorName?: string;
  errorMessage?: string;
  callStatusAtSettle?: string;
  statusTimeline?: { status: string; atMs: number }[];
}

/**
 * Withhold the answer while `window.__blockConnect` is set, so a leg acquires
 * media normally but never reaches `connected`.
 *
 * Blocking the ANSWER rather than the acquisition is what makes this a faithful
 * stand-in for an unserved invite — and it is now the only way to reach the
 * bound at all, since acquisition is deliberately unbounded.
 *
 * Must run BEFORE navigation so every peer connection the SDK builds is wrapped.
 */
async function injectBlockableConnect(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__blockConnect = false;
    window.__blockedAnswers = 0;
    const OriginalPC = window.RTCPeerConnection;
    if (typeof OriginalPC !== 'function') {
      return;
    }
    const patched = function (this: unknown, config?: RTCConfiguration) {
      const pc = new OriginalPC(config);
      const setRemote = pc.setRemoteDescription.bind(pc);
      pc.setRemoteDescription = (description: RTCSessionDescriptionInit) => {
        if (window.__blockConnect) {
          window.__blockedAnswers = (window.__blockedAnswers ?? 0) + 1;
          // The answer is never applied, so this leg never connects — the same
          // terminal state as an invite the server never serves.
          return new Promise<void>(() => {});
        }
        return setRemote(description);
      };
      return pc;
    } as unknown as typeof RTCPeerConnection;
    patched.prototype = OriginalPC.prototype;
    window.RTCPeerConnection = patched;
  });
}

test.describe('Additional Device', () => {
  test.afterEach(async ({ page }) => {
    await page
      .evaluate(async () => {
        // Let hangup/disconnect run even with an answer still withheld.
        window.__blockConnect = false;
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

  // ── Test 1: a non-connecting additional device must fail in a device-appropriate time ──
  //
  // Regression guard for cloud-product#20520 (fixed): addAdditionalDevice is bounded
  // by DEFAULT_AUX_LEG_CONNECT_TIMEOUT_MS, not the screen-share picker's 50 s.

  test('addAdditionalDevice rejects within a device-appropriate budget when the leg never connects', async ({
    page,
    resource,
  }) => {
    test.setTimeout(T1_TEST_TIMEOUT_MS);

    // ── SETUP ──────────────────────────────────────────────
    // Install the wrapper before navigation; it stays inert until we arm it.
    await injectBlockableConnect(page);
    await setupRoomCall({ page, resource, prefix: 'e2e-add-device-timeout' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }): Promise<FailureProbeResult> => {
        const waitFor = window.__waitFor;
        const client = window.__swClient;
        const call = window.__swCall;
        const clientErrors: string[] = [];
        const sub = client.errors$.subscribe((err: unknown) => {
          clientErrors.push(
            err instanceof Error ? `${err.name}: ${err.message}` : String(err)
          );
        });

        try {
          const self = (await waitFor(
            call.self$,
            (s: unknown) => s !== null,
            obsTimeout,
            'self$ → non-null'
          ))!;

          // Main call is connected. From here every getUserMedia hangs, so the
          // auxiliary leg can never acquire media and its connectionState$
          // never reaches 'connected' — the state a never-answered leg is in.
          window.__blockConnect = true;

          const startedAt = performance.now();
          let outcome = 'fulfilled';
          let errorName = '';
          let errorMessage = '';
          let hasCause = false;

          try {
            await self.addAdditionalDevice({ audio: true, video: false });
          } catch (error) {
            outcome = 'rejected';
            errorName = error instanceof Error ? error.name : typeof error;
            errorMessage = error instanceof Error ? error.message : String(error);
            hasCause = Boolean(
              error instanceof Error && (error as Error & { cause?: unknown }).cause
            );
          }

          const elapsedMs = Math.round(performance.now() - startedAt);

          return {
            success: true,
            outcome,
            elapsedMs,
            errorName,
            errorMessage,
            hasCause,
            hungGumCalls: window.__blockedAnswers ?? 0,
            clientErrors,
            callStatusAtSettle: String(call.status),
          };
        } catch (error) {
          return { success: false, error: String(error) };
        } finally {
          sub.unsubscribe();
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `probe completed — ${result.error ?? ''}`).toBe(true);

    // Logged before the gating assertion so the measurement survives a failure.
    console.log(
      `[#20520 T1] addAdditionalDevice ${result.outcome} after ${result.elapsedMs} ms ` +
        `with ${result.errorName}: "${result.errorMessage}" (cause present: ${result.hasCause})`
    );
    console.log(
      `[#20520 T1] hung getUserMedia calls: ${result.hungGumCalls}; ` +
        `call.status at settle: ${result.callStatusAtSettle}`
    );
    console.log(
      `[#20520 T1] client.errors$ emissions during the wait: ` +
        `${JSON.stringify(result.clientErrors)}`
    );

    // Guards that the simulation actually took effect — if either of these
    // fails the timing number below means nothing.
    expect(
      result.hungGumCalls,
      'the additional-device leg attempted media acquisition (simulation armed)'
    ).toBeGreaterThan(0);
    expect(result.outcome, 'addAdditionalDevice settled by rejecting').toBe('rejected');

    expect(
      result.elapsedMs,
      `addAdditionalDevice must reject within ${DEVICE_FAILURE_BUDGET_MS} ms — ` +
        `no human is in the loop, so the 50 s screen-share picker budget does not apply`
    ).toBeLessThan(DEVICE_FAILURE_BUDGET_MS);
  });

  // ── Test 2: healthy-path connect timing (observation, non-gating) ───────────

  test('additional device connects on the healthy path within a generous bound', async ({
    page,
    resource,
  }) => {
    test.setTimeout(T2_TEST_TIMEOUT_MS);

    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-add-device-timing' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }): Promise<TimingProbeResult> => {
        const waitFor = window.__waitFor;
        const call = window.__swCall;
        const statusTimeline: { status: string; atMs: number }[] = [];
        let sub: { unsubscribe(): void } | undefined;

        try {
          const self = (await waitFor(
            call.self$,
            (s: unknown) => s !== null,
            obsTimeout,
            'self$ → non-null'
          ))!;

          // Application-supplied stream: a Web Audio tone, so no getUserMedia
          // and no device hardware latency sit inside the measurement.
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const destination = audioContext.createMediaStreamDestination();
          oscillator.connect(destination);
          oscillator.start();

          const startedAt = performance.now();
          sub = call.status$.subscribe((status: unknown) => {
            statusTimeline.push({
              status: String(status),
              atMs: Math.round(performance.now() - startedAt),
            });
          });

          let outcome = 'fulfilled';
          let errorName = '';
          let errorMessage = '';

          try {
            await self.addAdditionalDevice({
              audio: false,
              video: false,
              inputAudioStream: destination.stream,
            });
          } catch (error) {
            outcome = 'rejected';
            errorName = error instanceof Error ? error.name : typeof error;
            errorMessage = error instanceof Error ? error.message : String(error);
          }

          // Captured at the moment the leg reports connected — i.e. before the
          // unrelated #20523 teardown can perturb it.
          const elapsedMs = Math.round(performance.now() - startedAt);
          const callStatusAtSettle = String(call.status);

          // Record what happens next (the #20523 teardown) for information only.
          await new Promise((resolve) => setTimeout(resolve, 2000));

          return {
            success: true,
            outcome,
            elapsedMs,
            errorName,
            errorMessage,
            callStatusAtSettle,
            statusTimeline,
          };
        } catch (error) {
          return { success: false, error: String(error), statusTimeline };
        } finally {
          sub?.unsubscribe();
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `probe completed — ${result.error ?? ''}`).toBe(true);

    console.log(
      `[#20520 T2] addAdditionalDevice ${result.outcome} after ${result.elapsedMs} ms ` +
        `(call.status at settle: ${result.callStatusAtSettle})`
    );
    console.log(
      `[#20520 T2] call.status$ timeline (ms from the addAdditionalDevice call): ` +
        `${JSON.stringify(result.statusTimeline)}`
    );

    expect(
      result.outcome,
      `addAdditionalDevice resolved — ${result.errorName}: ${result.errorMessage}`
    ).toBe('fulfilled');
    expect(
      result.callStatusAtSettle,
      'the call was still connected when the additional-device leg reported connected'
    ).toBe('connected');
    expect(
      result.elapsedMs,
      `healthy additional-device connect stayed under ${HEALTHY_CONNECT_BUDGET_MS} ms`
    ).toBeLessThan(HEALTHY_CONNECT_BUDGET_MS);
  });
});
