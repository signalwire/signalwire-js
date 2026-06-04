/**
 * Media Renegotiation — E2E Test Suite
 *
 * Tests the SDK's ability to update media tracks mid-call via the
 * SelfParticipant mute/unmute API. Verifies that:
 *
 * - Initial media directions are `sendrecv` for both audio and video
 * - Muting/unmuting audio and video updates the observable state
 * - Local media tracks reflect the muted/unmuted state
 * - Multiple sequential renegotiations in a single session work correctly
 * - The local stream retains both tracks after a mute/unmute roundtrip
 *
 * All tests use `?channel=video` to ensure both audio and video are active.
 *
 * Observable waits use `window.__waitFor(obs$, predicate, timeout, label)`
 * which auto-unsubscribes after the first matching value — no subscription leaks.
 */
import { test, expect } from '../fixtures';
import { setupRoomCall } from '../helpers/setup';

const OBSERVABLE_TIMEOUT = 10_000;

test.describe('Media Renegotiation', () => {
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

  // ── Test 1: Initial media directions ────────────────────────────────────────

  test('initial media directions are sendrecv', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({
      page,
      resource,
      prefix: 'e2e-media-renego',
      channel: 'video',
    });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const directions = await waitFor(
            call.mediaDirections$,
            (d: unknown) => d !== null && d !== undefined,
            obsTimeout,
            'mediaDirections$ → initial'
          );

          return {
            success: true,
            audioDirection: (directions as { audio: string }).audio,
            videoDirection: (directions as { video: string }).video,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `mediaDirections$ emitted: ${result.error ?? ''}`).toBe(true);
    expect(result.audioDirection, 'audio direction is sendrecv').toBe('sendrecv');
    expect(result.videoDirection, 'video direction is sendrecv').toBe('sendrecv');
  });

  // ── Test 2: Mute video changes video track state ────────────────────────────

  test('mute video changes video track state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({
      page,
      resource,
      prefix: 'e2e-media-renego',
      channel: 'video',
    });

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
          )) as any;

          // Verify initial state: video not muted
          const initialVideoMuted = await waitFor(
            self.videoMuted$,
            (v: unknown) => v === false,
            obsTimeout,
            'videoMuted$ → initially false'
          );

          // Mute video
          await self.muteVideo();

          // Wait for videoMuted$ to emit true
          const videoMutedAfter = await waitFor(
            self.videoMuted$,
            (v: unknown) => v === true,
            obsTimeout,
            'videoMuted$ → true after muteVideo()'
          );

          // Check local video track state after mute
          // The SDK removes the video track via renegotiation rather than just disabling it
          const localStream = await waitFor(
            call.localStream$,
            (s: unknown) => s !== null && s !== undefined,
            obsTimeout,
            'localStream$ → non-null'
          );
          const videoTracks = (localStream as MediaStream).getVideoTracks();
          const videoTrackCount = videoTracks.length;
          const videoTrackEnabled = videoTracks.length > 0 ? videoTracks[0].enabled : null;

          return {
            success: true,
            initialVideoMuted,
            videoMutedAfter,
            videoTrackCount,
            videoTrackEnabled,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `mute video test: ${result.error ?? ''}`).toBe(true);
    expect(result.initialVideoMuted, 'video initially not muted').toBe(false);
    expect(result.videoMutedAfter, 'video muted after muteVideo()').toBe(true);
    // SDK removes video track on mute (renegotiation) rather than just disabling it
    if (result.videoTrackCount === 0) {
      expect(result.videoTrackCount, 'video track removed after mute').toBe(0);
    } else {
      expect(result.videoTrackEnabled, 'video track disabled after mute').toBe(false);
    }
  });

  // ── Test 3: Unmute video restores video track ───────────────────────────────

  test('unmute video restores video track', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({
      page,
      resource,
      prefix: 'e2e-media-renego',
      channel: 'video',
    });

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
          )) as any;

          // Mute video first
          await self.muteVideo();
          await waitFor(
            self.videoMuted$,
            (v: unknown) => v === true,
            obsTimeout,
            'videoMuted$ → true after muteVideo()'
          );

          // Unmute video
          await self.unmuteVideo();
          const videoMutedAfterUnmute = await waitFor(
            self.videoMuted$,
            (v: unknown) => v === false,
            obsTimeout,
            'videoMuted$ → false after unmuteVideo()'
          );

          // Check local video track enabled state
          const localStream = await waitFor(
            call.localStream$,
            (s: unknown) => s !== null && s !== undefined,
            obsTimeout,
            'localStream$ → non-null'
          );
          const videoTracks = (localStream as MediaStream).getVideoTracks();
          const videoTrackEnabled = videoTracks.length > 0 ? videoTracks[0].enabled : null;

          return {
            success: true,
            videoMutedAfterUnmute,
            videoTrackEnabled,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `unmute video test: ${result.error ?? ''}`).toBe(true);
    expect(result.videoMutedAfterUnmute, 'video not muted after unmuteVideo()').toBe(false);
    expect(result.videoTrackEnabled, 'video track enabled after unmute').toBe(true);
  });

  // ── Test 4: Mute audio changes audio track state ────────────────────────────

  test('mute audio changes audio track state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({
      page,
      resource,
      prefix: 'e2e-media-renego',
      channel: 'video',
    });

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
          )) as any;

          // Verify initial state: audio not muted
          const initialAudioMuted = await waitFor(
            self.audioMuted$,
            (v: unknown) => v === false,
            obsTimeout,
            'audioMuted$ → initially false'
          );

          // Mute audio
          await self.mute();

          // Wait for audioMuted$ to emit true
          const audioMutedAfter = await waitFor(
            self.audioMuted$,
            (v: unknown) => v === true,
            obsTimeout,
            'audioMuted$ → true after mute()'
          );

          return {
            success: true,
            initialAudioMuted,
            audioMutedAfter,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `mute audio test: ${result.error ?? ''}`).toBe(true);
    expect(result.initialAudioMuted, 'audio initially not muted').toBe(false);
    expect(result.audioMutedAfter, 'audio muted after mute()').toBe(true);
  });

  // ── Test 5: Unmute audio restores audio track ───────────────────────────────

  test('unmute audio restores audio track', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({
      page,
      resource,
      prefix: 'e2e-media-renego',
      channel: 'video',
    });

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
          )) as any;

          // Mute audio first
          await self.mute();
          await waitFor(
            self.audioMuted$,
            (v: unknown) => v === true,
            obsTimeout,
            'audioMuted$ → true after mute()'
          );

          // Unmute audio
          await self.unmute();
          const audioMutedAfterUnmute = await waitFor(
            self.audioMuted$,
            (v: unknown) => v === false,
            obsTimeout,
            'audioMuted$ → false after unmute()'
          );

          return {
            success: true,
            audioMutedAfterUnmute,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `unmute audio test: ${result.error ?? ''}`).toBe(true);
    expect(result.audioMutedAfterUnmute, 'audio not muted after unmute()').toBe(false);
  });

  // ── Test 6: Multiple sequential media updates ──────────────────────────────

  test('multiple sequential media updates', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({
      page,
      resource,
      prefix: 'e2e-media-renego',
      channel: 'video',
    });

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
          )) as any;

          // Step 1: Mute video
          await self.muteVideo();
          const step1VideoMuted = await waitFor(
            self.videoMuted$,
            (v: unknown) => v === true,
            obsTimeout,
            'step1: videoMuted$ → true'
          );

          // Step 2: Mute audio
          await self.mute();
          const step2AudioMuted = await waitFor(
            self.audioMuted$,
            (v: unknown) => v === true,
            obsTimeout,
            'step2: audioMuted$ → true'
          );

          // Step 3: Unmute video
          await self.unmuteVideo();
          const step3VideoMuted = await waitFor(
            self.videoMuted$,
            (v: unknown) => v === false,
            obsTimeout,
            'step3: videoMuted$ → false'
          );

          // Step 4: Unmute audio
          await self.unmute();
          const step4AudioMuted = await waitFor(
            self.audioMuted$,
            (v: unknown) => v === false,
            obsTimeout,
            'step4: audioMuted$ → false'
          );

          return {
            success: true,
            step1VideoMuted,
            step2AudioMuted,
            step3VideoMuted,
            step4AudioMuted,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `sequential updates: ${result.error ?? ''}`).toBe(true);
    expect(result.step1VideoMuted, 'step 1: video muted').toBe(true);
    expect(result.step2AudioMuted, 'step 2: audio muted').toBe(true);
    expect(result.step3VideoMuted, 'step 3: video unmuted').toBe(false);
    expect(result.step4AudioMuted, 'step 4: audio unmuted').toBe(false);
  });

  // ── Test 7: Video mute/unmute roundtrip preserves local stream ─────────────

  test('video mute/unmute roundtrip preserves local stream', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({
      page,
      resource,
      prefix: 'e2e-media-renego',
      channel: 'video',
    });

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
          )) as any;

          // Capture initial stream track counts
          const initialStream = await waitFor(
            call.localStream$,
            (s: unknown) => s !== null && s !== undefined,
            obsTimeout,
            'localStream$ → initial'
          );
          const initialAudioTrackCount = (initialStream as MediaStream).getAudioTracks().length;
          const initialVideoTrackCount = (initialStream as MediaStream).getVideoTracks().length;

          // Mute video
          await self.muteVideo();
          await waitFor(
            self.videoMuted$,
            (v: unknown) => v === true,
            obsTimeout,
            'videoMuted$ → true'
          );

          // Unmute video
          await self.unmuteVideo();
          await waitFor(
            self.videoMuted$,
            (v: unknown) => v === false,
            obsTimeout,
            'videoMuted$ → false'
          );

          // Verify local stream still has both audio and video tracks
          const finalStream = await waitFor(
            call.localStream$,
            (s: unknown) => s !== null && s !== undefined,
            obsTimeout,
            'localStream$ → after roundtrip'
          );
          const finalAudioTrackCount = (finalStream as MediaStream).getAudioTracks().length;
          const finalVideoTrackCount = (finalStream as MediaStream).getVideoTracks().length;
          const finalVideoTrackEnabled = (finalStream as MediaStream).getVideoTracks()[0]?.enabled ?? null;
          const finalAudioTrackEnabled = (finalStream as MediaStream).getAudioTracks()[0]?.enabled ?? null;

          return {
            success: true,
            initialAudioTrackCount,
            initialVideoTrackCount,
            finalAudioTrackCount,
            finalVideoTrackCount,
            finalVideoTrackEnabled,
            finalAudioTrackEnabled,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `roundtrip preserves stream: ${result.error ?? ''}`).toBe(true);
    expect(result.initialAudioTrackCount, 'initial stream has audio track(s)').toBeGreaterThanOrEqual(1);
    expect(result.initialVideoTrackCount, 'initial stream has video track(s)').toBeGreaterThanOrEqual(1);
    expect(result.finalAudioTrackCount, 'final stream still has audio track(s)').toBeGreaterThanOrEqual(1);
    expect(result.finalVideoTrackCount, 'final stream still has video track(s)').toBeGreaterThanOrEqual(1);
    expect(result.finalVideoTrackEnabled, 'video track enabled after roundtrip').toBe(true);
    expect(result.finalAudioTrackEnabled, 'audio track enabled after roundtrip').toBe(true);
  });
});
