/**
 * Call-create timeout vs. slow getUserMedia — E2E Regression Suite
 *
 * Regression guard for cloud-product#20521, where the SDK's own `getUserMedia`
 * ran inside the call-create budget: a camera slower than the bound failed the
 * join, and the late stream hit `addTransceiver` on an already-closed
 * connection while its capture stayed open.
 *
 * **The delayed `getUserMedia` is a stand-in for slow hardware — nothing about
 * the SDK is mocked.** The report produced this organically with permissions
 * already granted; wrapping the real `getUserMedia` so it still resolves, only
 * late, reproduces it deterministically. Tracks the wrapper hands out are
 * recorded so `readyState` can be re-checked after a failed join.
 *
 * - T1 a ~9 s acquisition must still join.
 * - T2 a failed join must leave no live track and raise no `InvalidStateError`.
 * - T3 control: a ~1 s acquisition joins, proving the delay is the cause.
 */
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { setupRoomClient } from '../helpers/setup';

/** Stand-in for slow camera hardware — comfortably past the 6 s budget. */
const SLOW_GUM_DELAY_MS = 9_000;
/** Control delay — well inside the 6 s budget. */
const FAST_GUM_DELAY_MS = 1_000;

const CALL_CONNECT_TIMEOUT = 30_000;
/** 9 s of getUserMedia + a 6 s call-create timeout + real setup — go generous. */
const TEST_TIMEOUT = 120_000;
/** Beat to wait after every getUserMedia settled before re-reading tracks. */
const POST_FAILURE_GRACE_MS = 2_000;
/** Upper bound on waiting for a pending (delayed) getUserMedia to settle. */
const GUM_SETTLE_TIMEOUT_MS = 20_000;

/**
 * The late stream hitting a closed peer connection. Matches the DOMException
 * text only — no SDK log line contains either phrase on a healthy call.
 */
const LATE_STREAM_ERROR = /InvalidStateError|Failed to execute 'addTransceiver'/i;

// ── getUserMedia probe ───────────────────────────────────────

interface GumCall {
  constraints: string;
  calledAt: number;
  /** `performance.now()` when the call resolved or rejected; null while pending. */
  settledAt: number | null;
  error: string | null;
}

interface GumProbe {
  delayMs: number;
  calls: GumCall[];
  /** Every track handed out by the wrapped getUserMedia, kept for readyState checks. */
  tracks: MediaStreamTrack[];
}

type ProbeWindow = { __gumProbe?: GumProbe };

/**
 * Delays, then delegates to the real implementation — the devices genuinely
 * open, just late. Must run BEFORE navigation.
 */
async function installSlowGetUserMedia(
  page: Page,
  delayMs: number
): Promise<void> {
  await page.addInitScript((delay: number) => {
    const probe: GumProbe = { delayMs: delay, calls: [], tracks: [] };
    (window as ProbeWindow).__gumProbe = probe;

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) return;

    const original = mediaDevices.getUserMedia.bind(mediaDevices);

    mediaDevices.getUserMedia = async (
      constraints?: MediaStreamConstraints
    ): Promise<MediaStream> => {
      const entry: GumCall = {
        constraints: JSON.stringify(constraints ?? {}),
        calledAt: performance.now(),
        settledAt: null,
        error: null,
      };
      probe.calls.push(entry);

      await new Promise((resolve) => setTimeout(resolve, delay));

      try {
        const stream = await original(constraints);
        entry.settledAt = performance.now();
        probe.tracks.push(...stream.getTracks());
        return stream;
      } catch (error) {
        entry.settledAt = performance.now();
        entry.error = String(error);
        throw error;
      }
    };
  }, delayMs);
}

function captureConsole(page: Page): string[] {
  const messages: string[] = [];
  page.on('console', (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => messages.push(`[pageerror] ${err.message}`));
  return messages;
}

// ── Dial attempt ─────────────────────────────────────────────

interface DialAttempt {
  /** True when `dial()` itself rejected (the defect's symptom). */
  dialThrew: boolean;
  dialError: string;
  /** `performance.now()` when `dial()` resolved or rejected. */
  dialSettledAt: number;
  /** Status reached after a successful `dial()`, else null. */
  finalStatus: string | null;
  statusError: string;
  gumCalls: GumCall[];
}

/**
 * Dial `dest` and, when `dial()` resolves, wait for `status$ → 'connected'`.
 * Never throws — every outcome is reported so assertions can inspect it.
 */
async function attemptDial(page: Page, dest: string): Promise<DialAttempt> {
  return page.evaluate(
    async ({ dest, connectTimeout }) => {
      const probe = (window as ProbeWindow).__gumProbe;

      let dialThrew = false;
      let dialError = '';
      let dialSettledAt = 0;
      let finalStatus: string | null = null;
      let statusError = '';

      try {
        const call = await window.__swClient.dial(dest);
        dialSettledAt = performance.now();
        window.__swCall = call;
      } catch (error) {
        dialSettledAt = performance.now();
        dialThrew = true;
        dialError = String(error);
      }

      if (!dialThrew) {
        try {
          finalStatus = await window.__waitFor(
            window.__swCall.status$,
            (s) => s === 'connected',
            connectTimeout,
            'status$ → connected'
          );
        } catch (error) {
          statusError = String(error);
          finalStatus = window.__swCall?.status ?? null;
        }
      }

      return {
        dialThrew,
        dialError,
        dialSettledAt,
        finalStatus,
        statusError,
        gumCalls: (probe?.calls ?? []).map((c) => ({ ...c })),
      };
    },
    { dest, connectTimeout: CALL_CONNECT_TIMEOUT }
  );
}

interface ProbeSnapshot {
  trackStates: Array<{ id: string; kind: string; readyState: string }>;
  gumCalls: GumCall[];
}

/**
 * Wait until every wrapped `getUserMedia` has settled — the delayed stream
 * arrives AFTER the join already failed — then read back each handed-out
 * track's `readyState`.
 */
async function readProbeAfterSettle(
  page: Page,
  graceMs: number
): Promise<ProbeSnapshot> {
  return page.evaluate(
    async ({ graceMs, settleTimeout }) => {
      const probe = (window as ProbeWindow).__gumProbe;
      const deadline = performance.now() + settleTimeout;

      while (
        probe &&
        probe.calls.some((c) => c.settledAt === null) &&
        performance.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      // A beat for any cleanup the late stream triggers to run.
      await new Promise((resolve) => setTimeout(resolve, graceMs));

      return {
        trackStates: (probe?.tracks ?? []).map((t) => ({
          id: t.id,
          kind: t.kind,
          readyState: String(t.readyState),
        })),
        gumCalls: (probe?.calls ?? []).map((c) => ({ ...c })),
      };
    },
    { graceMs, settleTimeout: GUM_SETTLE_TIMEOUT_MS }
  );
}

/** Milliseconds between the first getUserMedia call and `dial()` settling. */
function gumToDialSettleMs(attempt: DialAttempt): number | null {
  const first = attempt.gumCalls[0];
  if (!first) return null;
  return Math.round(attempt.dialSettledAt - first.calledAt);
}

// ── Tests ────────────────────────────────────────────────────

test.describe('Call create timeout vs. slow getUserMedia', () => {
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

  // ── T1: slow getUserMedia must not fail the join ───────────────────────────

  test('slow getUserMedia — dial() must still resolve and the call must connect', async ({
    page,
    resource,
  }) => {
    // Regression guard for cloud-product#20521 (fixed).
    test.setTimeout(TEST_TIMEOUT);

    // ── SETUP ──────────────────────────────────────────────
    // Install the delayed getUserMedia BEFORE navigation so the SDK's own
    // media acquisition — which runs inside the 6 s call-create budget — is
    // the call that gets delayed.
    await installSlowGetUserMedia(page, SLOW_GUM_DELAY_MS);

    const roomName = await setupRoomClient({
      page,
      resource,
      prefix: 'e2e-create-timeout-slow',
    });

    // ── CHECK ──────────────────────────────────────────────
    const attempt = await attemptDial(
      page,
      `/public/${roomName}?channel=video`
    );

    const interval = gumToDialSettleMs(attempt);
    console.log(
      `[T1] gUM delay=${SLOW_GUM_DELAY_MS}ms; gUM calls=${attempt.gumCalls.length}; ` +
        `gUM → dial settled=${interval ?? 'n/a'}ms; dialThrew=${attempt.dialThrew}; ` +
        `dialError=${attempt.dialError || 'none'}; finalStatus=${attempt.finalStatus ?? 'n/a'}`
    );

    expect(
      attempt.gumCalls.length,
      'the delayed getUserMedia wrapper was exercised by the SDK'
    ).toBeGreaterThanOrEqual(1);

    expect(
      attempt.dialThrew,
      `dial() resolves despite a ${SLOW_GUM_DELAY_MS}ms getUserMedia ` +
        '(must not be killed by the 6s callCreateTimeout)'
    ).toBe(false);

    expect(
      attempt.finalStatus,
      'call reaches connected status when getUserMedia is slow'
    ).toBe('connected');
  });

  // ── T2: a timed-out call must not leak the capture, nor throw ──────────────

  test('abandoning a call mid-acquisition releases the capture and raises no InvalidStateError', async ({
    page,
    resource,
  }) => {
    // Regression guard for cloud-product#20521's second complaint: a capture that
    // lands after the call is gone must be released, not handed to a closed peer
    // connection.
    //
    // The original trigger — the call-create timeout firing while getUserMedia is
    // still pending — is now structurally impossible, because acquisition is
    // unbounded and the clock only starts once it settles. Hanging up during
    // acquisition is the remaining way to reach the same state, so that is what
    // this exercises.
    test.setTimeout(TEST_TIMEOUT);

    // ── SETUP ──────────────────────────────────────────────
    const consoleMessages = captureConsole(page);
    await installSlowGetUserMedia(page, SLOW_GUM_DELAY_MS);

    const roomName = await setupRoomClient({
      page,
      resource,
      prefix: 'e2e-create-abandon',
    });

    // ── CHECK ──────────────────────────────────────────────
    // Start the dial, then abandon it while getUserMedia is still pending.
    const abandoned = await page.evaluate(
      async ({ dest, abandonAfterMs }) => {
        const client = window.__swClient;
        let dialThrew = false;
        const dial = client.dial(dest).then(
          (call: unknown) => {
            window.__swCall = call as typeof window.__swCall;
          },
          () => {
            dialThrew = true;
          }
        );

        await new Promise((r) => setTimeout(r, abandonAfterMs));
        // Tear the session down underneath the pending acquisition.
        await client.disconnect().catch(() => undefined);
        await dial.catch(() => undefined);
        return { dialThrew };
      },
      { dest: `/public/${roomName}?channel=video`, abandonAfterMs: 2_000 }
    );

    // Let the delayed capture land, for a call that no longer exists.
    const snapshot = await readProbeAfterSettle(page, POST_FAILURE_GRACE_MS);
    const liveTracks = snapshot.trackStates.filter(
      (t) => t.readyState !== 'ended'
    );
    const lateStreamErrors = consoleMessages.filter((m) =>
      LATE_STREAM_ERROR.test(m)
    );

    console.log(
      `[T2] abandoned mid-acquisition; dialThrew=${abandoned.dialThrew}; ` +
        `tracks=${JSON.stringify(snapshot.trackStates)}; ` +
        `lateStreamErrors=${JSON.stringify(lateStreamErrors)}`
    );

    expect(
      snapshot.gumCalls.length,
      'the delayed getUserMedia wrapper was exercised by the SDK'
    ).toBeGreaterThanOrEqual(1);

    expect(
      liveTracks,
      'every track handed out by getUserMedia is ended once the call is abandoned ' +
        '(no capture left running for a call that no longer exists)'
    ).toEqual([]);

    expect(
      lateStreamErrors,
      "the late stream must not hit a closed RTCPeerConnection — no InvalidStateError / addTransceiver error"
    ).toEqual([]);
  });

  test('control — fast getUserMedia joins successfully', async ({
    page,
    resource,
  }) => {
    test.setTimeout(TEST_TIMEOUT);

    // ── SETUP ──────────────────────────────────────────────
    // Identical harness to T1/T2, only the delay differs — this is what proves
    // the delay (not the wrapper) is what breaks the join.
    await installSlowGetUserMedia(page, FAST_GUM_DELAY_MS);

    const roomName = await setupRoomClient({
      page,
      resource,
      prefix: 'e2e-create-timeout-control',
    });

    // ── CHECK ──────────────────────────────────────────────
    const attempt = await attemptDial(
      page,
      `/public/${roomName}?channel=video`
    );

    console.log(
      `[T3] gUM delay=${FAST_GUM_DELAY_MS}ms; gUM calls=${attempt.gumCalls.length}; ` +
        `gUM → dial settled=${gumToDialSettleMs(attempt) ?? 'n/a'}ms; ` +
        `dialThrew=${attempt.dialThrew}; finalStatus=${attempt.finalStatus ?? 'n/a'}`
    );

    expect(
      attempt.gumCalls.length,
      'the getUserMedia wrapper was exercised by the SDK'
    ).toBeGreaterThanOrEqual(1);

    expect(
      attempt.dialThrew,
      `dial() resolves with a ${FAST_GUM_DELAY_MS}ms getUserMedia — ${attempt.dialError}`
    ).toBe(false);

    expect(
      attempt.finalStatus,
      'call reaches connected status with a fast getUserMedia'
    ).toBe('connected');
  });
});
