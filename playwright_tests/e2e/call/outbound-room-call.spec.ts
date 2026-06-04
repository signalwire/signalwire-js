/**
 * Outbound Room Calls — dial() E2E Test Suite
 *
 * Tests all variations of client.dial() to room destinations.
 * This suite does NOT use the dialAndJoin() helper because it IS testing
 * the dial behavior itself. Each test implements its own dial steps.
 *
 * Observable waits use `window.__waitFor(obs$, predicate, timeout, label)`
 * which auto-unsubscribes after the first matching value — no subscription leaks.
 */
import { test, expect } from '../fixtures';
import { setupRoomClient } from '../helpers/setup';

const CALL_CONNECT_TIMEOUT = 30_000;
const OBSERVABLE_TIMEOUT = 10_000;

test.describe('Outbound Room Call', () => {
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

  test('video channel — should dial with ?channel=video and verify AV media', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    const roomName = await setupRoomClient({ page, resource, prefix: 'e2e-dial-video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ dest, connectTimeout, obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = await window.__swClient.dial(dest);
          window.__swCall = call;

          await waitFor(call.status$, (s) => s === 'connected', connectTimeout, 'status$ → connected');

          const self = await waitFor(call.self$, (s) => s !== null, obsTimeout, 'self$ → non-null');

          const directions = await waitFor(
            call.mediaDirections$,
            (d) => d.audio === 'sendrecv' && d.video === 'sendrecv',
            obsTimeout,
            'mediaDirections$ → sendrecv/sendrecv'
          );

          return {
            success: true,
            direction: call.direction,
            hasSelf: self !== null,
            audioDir: directions.audio,
            videoDir: directions.video,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { dest: `/public/${roomName}?channel=video`, connectTimeout: CALL_CONNECT_TIMEOUT, obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'dial() succeeded').toBe(true);
    expect(result.direction, 'call direction is outbound').toBe('outbound');
    expect(result.hasSelf, 'self participant is available').toBe(true);
    expect(result.audioDir, 'audio direction is sendrecv').toBe('sendrecv');
    expect(result.videoDir, 'video direction is sendrecv').toBe('sendrecv');
  });

  test('audio channel — should dial with ?channel=audio and have no video tracks', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    const roomName = await setupRoomClient({ page, resource, prefix: 'e2e-dial-audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ dest, connectTimeout, obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = await window.__swClient.dial(dest);
          window.__swCall = call;

          await waitFor(call.status$, (s) => s === 'connected', connectTimeout, 'status$ → connected');

          const stream = await waitFor(
            call.localStream$,
            (s): s is MediaStream => s !== null,
            obsTimeout,
            'localStream$ → non-null'
          );

          return {
            success: true,
            direction: call.direction,
            audioTracks: stream!.getAudioTracks().length,
            videoTracks: stream!.getVideoTracks().length,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { dest: `/public/${roomName}?channel=audio`, connectTimeout: CALL_CONNECT_TIMEOUT, obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'dial() succeeded').toBe(true);
    expect(result.direction, 'call direction is outbound').toBe('outbound');
    expect(result.audioTracks, 'audio-only call has at least 1 audio track').toBeGreaterThanOrEqual(1);
    expect(result.videoTracks, 'audio-only call has 0 video tracks').toBe(0);
  });

  test('explicit options override — overrides ?channel=video with audio-only options', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    const roomName = await setupRoomClient({ page, resource, prefix: 'e2e-dial-override' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ dest, connectTimeout, obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = await window.__swClient.dial(dest, {
            audio: true,
            video: false,
            receiveVideo: false,
          });
          window.__swCall = call;

          await waitFor(call.status$, (s) => s === 'connected', connectTimeout, 'status$ → connected');

          const stream = await waitFor(
            call.localStream$,
            (s): s is MediaStream => s !== null,
            obsTimeout,
            'localStream$ → non-null'
          );

          return {
            success: true,
            direction: call.direction,
            audioTracks: stream!.getAudioTracks().length,
            videoTracks: stream!.getVideoTracks().length,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { dest: `/public/${roomName}?channel=video`, connectTimeout: CALL_CONNECT_TIMEOUT, obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'dial() succeeded').toBe(true);
    expect(result.direction, 'call direction is outbound').toBe('outbound');
    expect(result.videoTracks, 'explicit video:false overrides ?channel=video').toBe(0);
    expect(result.audioTracks, 'audio tracks are present').toBeGreaterThanOrEqual(1);
  });

  test('default destination — should dial with no channel query parameter', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    const roomName = await setupRoomClient({ page, resource, prefix: 'e2e-dial-default' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ dest, connectTimeout, obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = await window.__swClient.dial(dest);
          window.__swCall = call;

          await waitFor(call.status$, (s) => s === 'connected', connectTimeout, 'status$ → connected');

          const self = await waitFor(
            call.self$,
            (s) => s !== null,
            obsTimeout,
            'self$ → non-null'
          ) as { id: string };

          return {
            success: true,
            direction: call.direction,
            hasSelf: true,
            hasId: typeof self.id === 'string' && self.id.length > 0,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { dest: `/public/${roomName}`, connectTimeout: CALL_CONNECT_TIMEOUT, obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'dial() succeeded').toBe(true);
    expect(result.direction, 'call direction is outbound').toBe('outbound');
    expect(result.hasSelf, 'self is present after dial').toBe(true);
    expect(result.hasId, 'self participant has an id').toBe(true);
  });

  test('status transitions — dial() should return a call that reaches connected', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    const roomName = await setupRoomClient({ page, resource, prefix: 'e2e-dial-status' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ dest, connectTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = await window.__swClient.dial(dest);
          window.__swCall = call;

          const initialStatus = call.status;

          const connectedStatus = await waitFor(
            call.status$,
            (s) => s === 'connected',
            connectTimeout,
            'status$ → connected'
          );

          return {
            success: true,
            direction: call.direction,
            initialStatus,
            connectedStatus,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { dest: `/public/${roomName}?channel=audio`, connectTimeout: CALL_CONNECT_TIMEOUT }
    );

    expect(result.success, 'dial() succeeded').toBe(true);
    expect(result.direction, 'call direction is outbound').toBe('outbound');
    expect(
      result.initialStatus,
      'initial status is a valid call lifecycle state'
    ).toMatch(/^(new|trying|ringing|connecting|connected)$/);
    expect(result.connectedStatus, 'call reaches connected').toBe('connected');
  });

  test('local stream — should produce audio and video tracks for video call', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    const roomName = await setupRoomClient({ page, resource, prefix: 'e2e-dial-stream' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ dest, connectTimeout, obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = await window.__swClient.dial(dest);
          window.__swCall = call;

          await waitFor(call.status$, (s) => s === 'connected', connectTimeout, 'status$ → connected');

          const stream = await waitFor(
            call.localStream$,
            (s): s is MediaStream => s !== null,
            obsTimeout,
            'localStream$ → non-null'
          );

          const audioTracks = stream!.getAudioTracks();
          const videoTracks = stream!.getVideoTracks();

          return {
            success: true,
            direction: call.direction,
            audioTracks: audioTracks.length,
            videoTracks: videoTracks.length,
            audioTrackEnabled: audioTracks.length > 0 && audioTracks[0].enabled,
            videoTrackEnabled: videoTracks.length > 0 && videoTracks[0].enabled,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { dest: `/public/${roomName}?channel=video`, connectTimeout: CALL_CONNECT_TIMEOUT, obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'dial() succeeded').toBe(true);
    expect(result.direction, 'call direction is outbound').toBe('outbound');
    expect(result.audioTracks, 'video call has at least 1 audio track').toBeGreaterThanOrEqual(1);
    expect(result.videoTracks, 'video call has at least 1 video track').toBeGreaterThanOrEqual(1);
    expect(result.audioTrackEnabled, 'audio track is enabled').toBe(true);
    expect(result.videoTrackEnabled, 'video track is enabled').toBe(true);
  });

  test('hangup — should transition to disconnected after hangup()', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    const roomName = await setupRoomClient({ page, resource, prefix: 'e2e-dial-hangup' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ dest, connectTimeout, obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = await window.__swClient.dial(dest);
          window.__swCall = call;

          await waitFor(call.status$, (s) => s === 'connected', connectTimeout, 'status$ → connected');

          // Set up disconnect listener BEFORE calling hangup
          const disconnectPromise = waitFor(
            call.status$,
            (s) => s === 'disconnected' || s === 'destroyed',
            obsTimeout,
            'status$ → disconnected after hangup'
          );

          await call.hangup();

          const finalStatus = await disconnectPromise;

          return {
            success: true,
            direction: call.direction,
            finalStatus,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { dest: `/public/${roomName}?channel=audio`, connectTimeout: CALL_CONNECT_TIMEOUT, obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'hangup completed').toBe(true);
    expect(result.direction, 'call direction is outbound').toBe('outbound');
    expect(
      result.finalStatus,
      'call reaches disconnected or destroyed after hangup'
    ).toMatch(/^(disconnected|destroyed)$/);
  });

  test('participants — has at least one participant (self) after joining room', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    const roomName = await setupRoomClient({ page, resource, prefix: 'e2e-dial-parts' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ dest, connectTimeout, obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = await window.__swClient.dial(dest);
          window.__swCall = call;

          await waitFor(call.status$, (s) => s === 'connected', connectTimeout, 'status$ → connected');

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → non-empty'
          );

          return {
            success: true,
            direction: call.direction,
            count: participants.length,
            hasParticipantWithId:
              participants[0] != null && typeof participants[0].id === 'string',
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { dest: `/public/${roomName}?channel=audio`, connectTimeout: CALL_CONNECT_TIMEOUT, obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'dial() succeeded').toBe(true);
    expect(result.direction, 'call direction is outbound').toBe('outbound');
    expect(result.count, 'at least 1 participant (self) is present').toBeGreaterThanOrEqual(1);
    expect(result.hasParticipantWithId, 'participant has a string id').toBe(true);
  });
});
