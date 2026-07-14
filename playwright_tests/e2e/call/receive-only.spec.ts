/**
 * Receive-only calls — E2E Test Suite
 *
 * Verifies the platform accepts a participant that sends no media:
 * dial with no send intent (audio:false, video:false) but receive intent
 * (receiveAudio:true) and assert the call reaches 'connected' with
 * receive-only media directions. This exercises the same negotiation path
 * used by the receive-only fallback when local media access is denied
 * (fake media auto-grants, so a real denial can't be scripted here).
 */
import { test, expect } from '../fixtures';
import { setupRoomClient } from '../helpers/setup';

const CALL_CONNECT_TIMEOUT = 30_000;
const OBSERVABLE_TIMEOUT = 10_000;

test.describe('Receive-only Call', () => {
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

  test('no send intent — should connect receive-only with recvonly audio', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    const roomName = await setupRoomClient({ page, resource, prefix: 'e2e-recvonly' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ dest, connectTimeout, obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = await window.__swClient.dial(dest, {
            audio: false,
            video: false,
            receiveAudio: true,
            receiveVideo: false,
          });
          window.__swCall = call;

          const connectedStatus = await waitFor(
            call.status$,
            (s) => s === 'connected',
            connectTimeout,
            'status$ → connected (receive-only)'
          );

          const directions = await waitFor(
            call.mediaDirections$,
            (d) => d.audio === 'recvonly',
            obsTimeout,
            'mediaDirections$ → audio recvonly'
          );

          // No local media was requested — nothing should be sent
          const localStream = call.localStream;
          const localAudioTracks = localStream?.getAudioTracks().length ?? 0;
          const localVideoTracks = localStream?.getVideoTracks().length ?? 0;

          return {
            success: true,
            direction: call.direction,
            connectedStatus,
            audioDir: directions.audio,
            videoDir: directions.video,
            localAudioTracks,
            localVideoTracks,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      {
        dest: `/public/${roomName}?channel=audio`,
        connectTimeout: CALL_CONNECT_TIMEOUT,
        obsTimeout: OBSERVABLE_TIMEOUT,
      }
    );

    expect(
      result.success,
      `Receive-only dial failed (platform may reject a sendless participant): ${
        result.success ? '' : result.error
      }`
    ).toBe(true);
    expect(result.direction, 'call direction is outbound').toBe('outbound');
    expect(result.connectedStatus, 'call reaches connected without sending media').toBe(
      'connected'
    );
    expect(result.audioDir, 'audio direction is recvonly').toBe('recvonly');
    expect(result.videoDir, 'side effect: video should not be sent').not.toMatch(/^send/);
    expect(result.localAudioTracks, 'no local audio track is captured').toBe(0);
    expect(result.localVideoTracks, 'no local video track is captured').toBe(0);
  });
});
