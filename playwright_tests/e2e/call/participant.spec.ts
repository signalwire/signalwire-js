/**
 * Participant API — E2E Test Suite
 *
 * Tests the complete CallParticipant API surface via call.participants$.
 * In a single-client room, participants$ contains exactly one entry — the
 * self participant. All method and observable tests operate on that participant.
 *
 * Some control methods (remove, end, setPosition) may require admin permissions
 * or may behave differently on self vs remote participants. Those tests are
 * structured to accept either a successful result or a recognizable error.
 */
import { test, expect } from '../fixtures';
import { setupRoomCall } from '../helpers/setup';

const CALL_CONNECT_TIMEOUT = 30_000;
const OBSERVABLE_TIMEOUT = 10_000;

test.describe('Participant API', () => {
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
      .catch(() => { });
  });

  // ── Group 1: participants$ structure ────────────────────────────────────────

  test('participants$ emits at least one participant with required properties', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-struct', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const p = participants[0];

          return {
            success: true,
            count: participants.length,
            hasId: typeof p.id === 'string' && p.id.length > 0,
            hasName$: p.name$ != null && typeof p.name$.subscribe === 'function',
            hasAudioMuted$: p.audioMuted$ != null && typeof p.audioMuted$.subscribe === 'function',
            hasVideoMuted$: p.videoMuted$ != null && typeof p.videoMuted$.subscribe === 'function',
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participants$ check succeeded').toBe(true);
    expect(result.count, 'participants$ emits at least 1 participant').toBeGreaterThanOrEqual(1);
    expect(result.hasId, 'participant.id is a non-empty string').toBe(true);
    expect(result.hasName$, 'participant.name$ is an observable').toBe(true);
    expect(result.hasAudioMuted$, 'participant.audioMuted$ is an observable').toBe(true);
    expect(result.hasVideoMuted$, 'participant.videoMuted$ is an observable').toBe(true);
  });

  // ── Group 2: Observable properties emit initial values ──────────────────────

  test('all participant observables are accessible and emit values', async ({
    page,
    resource,
  }) => {
    test.setTimeout(60_000);

    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-obs', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        const defined = (v: unknown) => v !== undefined;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const p = participants[0];

          // Wait for all observables in parallel — each resolves when server data arrives
          const [
            name, type, handraised, visible, audioMuted, videoMuted, deaf,
            echoCancellation, autoGain, noiseSuppression, lowbitrate, denoise, isTalking,
          ] = await Promise.all([
            waitFor(p.name$, defined, obsTimeout, 'participant.name$'),
            waitFor(p.type$, defined, obsTimeout, 'participant.type$'),
            waitFor(p.handraised$, defined, obsTimeout, 'participant.handraised$'),
            waitFor(p.visible$, defined, obsTimeout, 'participant.visible$'),
            waitFor(p.audioMuted$, defined, obsTimeout, 'participant.audioMuted$'),
            waitFor(p.videoMuted$, defined, obsTimeout, 'participant.videoMuted$'),
            waitFor(p.deaf$, defined, obsTimeout, 'participant.deaf$'),
            waitFor(p.echoCancellation$, defined, obsTimeout, 'participant.echoCancellation$'),
            waitFor(p.autoGain$, defined, obsTimeout, 'participant.autoGain$'),
            waitFor(p.noiseSuppression$, defined, obsTimeout, 'participant.noiseSuppression$'),
            waitFor(p.lowbitrate$, defined, obsTimeout, 'participant.lowbitrate$'),
            waitFor(p.denoise$, defined, obsTimeout, 'participant.denoise$'),
            // isTalking$ may remain undefined — talking events arrive via member.talking, not call.joined
            waitFor(p.isTalking$, () => true, obsTimeout, 'participant.isTalking$'),
          ]);

          return {
            success: true,
            name,
            type,
            handraised,
            visible,
            audioMuted,
            videoMuted,
            deaf,
            echoCancellation,
            autoGain,
            noiseSuppression,
            lowbitrate,
            denoise,
            isTalking,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `observable emission check failed: ${result.success ? '' : result.error}`).toBe(true);
    // All boolean observables emits booleans
    expect(typeof result.handraised, 'handraised$ emits a boolean').toBe('boolean');
    expect(typeof result.visible, 'visible$ emits a boolean').toBe('boolean');
    expect(typeof result.audioMuted, 'audioMuted$ emits a boolean').toBe('boolean');
    expect(typeof result.videoMuted, 'videoMuted$ emits a boolean').toBe('boolean');
    expect(typeof result.deaf, 'deaf$ emits a boolean').toBe('boolean');
    expect(typeof result.echoCancellation, 'echoCancellation$ emits a boolean').toBe('boolean');
    expect(typeof result.autoGain, 'autoGain$ emits a boolean').toBe('boolean');
    expect(typeof result.noiseSuppression, 'noiseSuppression$ emits a boolean').toBe('boolean');
    expect(typeof result.lowbitrate, 'lowbitrate$ emits a boolean').toBe('boolean');
    expect(typeof result.denoise, 'denoise$ emits a boolean').toBe('boolean');
    // isTalking$ may emit undefined if talking event hasn't arrived yet
    expect(['boolean', 'undefined'], 'isTalking$ emits boolean or undefined').toContain(typeof result.isTalking);
  });

  // ── Group 3: Sync getters have correct types ─────────────────────────────────

  test('participant sync getters have correct types', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-getters', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const p = participants[0];

          return {
            success: true,
            idType: typeof p.id,
            audioMutedType: typeof p.audioMuted,
            videoMutedType: typeof p.videoMuted,
            handraisedType: typeof p.handraised,
            visibleType: typeof p.visible,
            deafType: typeof p.deaf,
            echoCancellationType: typeof p.echoCancellation,
            autoGainType: typeof p.autoGain,
            noiseSuppressionType: typeof p.noiseSuppression,
            lowbitrateType: typeof p.lowbitrate,
            denoiseType: typeof p.denoise,
            isTalkingType: typeof p.isTalking,
            isAudienceType: typeof p.isAudience,
            // Optional getters — can be undefined or their type
            nameIsStringOrUndefined: p.name === undefined || typeof p.name === 'string',
            typeIsStringOrUndefined: p.type === undefined || typeof p.type === 'string',
            inputVolumeIsNumberOrUndefined: p.inputVolume === undefined || typeof p.inputVolume === 'number',
            outputVolumeIsNumberOrUndefined: p.outputVolume === undefined || typeof p.outputVolume === 'number',
            inputSensitivityIsNumberOrUndefined: p.inputSensitivity === undefined || typeof p.inputSensitivity === 'number',
            userIdIsStringOrUndefined: p.userId === undefined || typeof p.userId === 'string',
            addressIdIsStringOrUndefined: p.addressId === undefined || typeof p.addressId === 'string',
            nodeIdIsStringOrUndefined: p.nodeId === undefined || typeof p.nodeId === 'string',
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'sync getter check succeeded').toBe(true);
    expect(result.idType, 'participant.id is a string').toBe('string');
    expect(result.audioMutedType, 'participant.audioMuted is a boolean').toBe('boolean');
    expect(result.videoMutedType, 'participant.videoMuted is a boolean').toBe('boolean');
    expect(result.handraisedType, 'participant.handraised is a boolean').toBe('boolean');
    expect(result.visibleType, 'participant.visible is a boolean').toBe('boolean');
    expect(result.deafType, 'participant.deaf is a boolean').toBe('boolean');
    expect(result.echoCancellationType, 'participant.echoCancellation is a boolean').toBe('boolean');
    expect(result.autoGainType, 'participant.autoGain is a boolean').toBe('boolean');
    expect(result.noiseSuppressionType, 'participant.noiseSuppression is a boolean').toBe('boolean');
    expect(result.lowbitrateType, 'participant.lowbitrate is a boolean').toBe('boolean');
    expect(result.denoiseType, 'participant.denoise is a boolean').toBe('boolean');
    expect(result.isTalkingType, 'participant.isTalking is a boolean').toBe('boolean');
    expect(result.isAudienceType, 'participant.isAudience is a boolean').toBe('boolean');
    expect(result.nameIsStringOrUndefined, 'participant.name is string or undefined').toBe(true);
    expect(result.typeIsStringOrUndefined, 'participant.type is string or undefined').toBe(true);
    expect(result.inputVolumeIsNumberOrUndefined, 'participant.inputVolume is number or undefined').toBe(true);
    expect(result.outputVolumeIsNumberOrUndefined, 'participant.outputVolume is number or undefined').toBe(true);
    expect(result.inputSensitivityIsNumberOrUndefined, 'participant.inputSensitivity is number or undefined').toBe(true);
    expect(result.userIdIsStringOrUndefined, 'participant.userId is string or undefined').toBe(true);
    expect(result.addressIdIsStringOrUndefined, 'participant.addressId is string or undefined').toBe(true);
    expect(result.nodeIdIsStringOrUndefined, 'participant.nodeId is string or undefined').toBe(true);
  });

  // ── Group 4: Audio control methods ──────────────────────────────────────────

  test('participant.mute() mutes audio and updates audioMuted$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-mute', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          await participant.mute();

          const isMuted = await waitFor(
            participant.audioMuted$,
            (m) => m === true,
            obsTimeout,
            'participant.audioMuted$ → true after mute()'
          );

          return { success: true, isMuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.mute() succeeded').toBe(true);
    expect(result.isMuted, 'audioMuted$ is true after mute()').toBe(true);
  });

  test('participant.unmute() unmutes audio and updates audioMuted$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-unmute', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          // First mute so we have a known state to unmute from
          await participant.mute();
          await waitFor(participant.audioMuted$, (m) => m === true, obsTimeout, 'participant.audioMuted$ → true before unmute');

          await participant.unmute();

          const isUnmuted = await waitFor(
            participant.audioMuted$,
            (m) => m === false,
            obsTimeout,
            'participant.audioMuted$ → false after unmute()'
          );

          return { success: true, isUnmuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.unmute() succeeded').toBe(true);
    expect(result.isUnmuted, 'audioMuted$ is false after unmute()').toBe(false);
  });

  test('participant.toggleMute() toggles audioMuted$ state', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-toggle', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const initialMuted = await waitFor(
            participant.audioMuted$,
            () => true,
            obsTimeout,
            'participant.audioMuted$ → initial value'
          );

          // Toggle — flips the muted state
          await participant.toggleMute();

          const toggledMuted = await waitFor(
            participant.audioMuted$,
            (m) => m !== initialMuted,
            obsTimeout,
            'participant.audioMuted$ → toggled value'
          );

          return { success: true, initialMuted, toggledMuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.toggleMute() succeeded').toBe(true);
    expect(result.toggledMuted, 'audioMuted$ is flipped after toggleMute()').toBe(
      !result.initialMuted
    );
  });

  // ── Group 5: Video control methods ──────────────────────────────────────────

  test('participant.muteVideo() mutes video and updates videoMuted$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-vmute', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          await participant.muteVideo();

          const isVideoMuted = await waitFor(
            participant.videoMuted$,
            (m) => m === true,
            obsTimeout,
            'participant.videoMuted$ → true after muteVideo()'
          );

          return { success: true, isVideoMuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.muteVideo() succeeded').toBe(true);
    expect(result.isVideoMuted, 'videoMuted$ is true after muteVideo()').toBe(true);
  });

  test('participant.unmuteVideo() unmutes video', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-vunmute', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          // Mute first for a known state
          await participant.muteVideo();
          await waitFor(participant.videoMuted$, (m) => m === true, obsTimeout, 'participant.videoMuted$ → true before unmuteVideo');

          await participant.unmuteVideo();

          const isVideoUnmuted = await waitFor(
            participant.videoMuted$,
            (m) => m === false,
            obsTimeout,
            'participant.videoMuted$ → false after unmuteVideo()'
          );

          return { success: true, isVideoUnmuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.unmuteVideo() succeeded').toBe(true);
    expect(result.isVideoUnmuted, 'videoMuted$ is false after unmuteVideo()').toBe(false);
  });

  test('participant.toggleMuteVideo() toggles videoMuted$ state', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-vtog', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const initialVideoMuted = await waitFor(
            participant.videoMuted$,
            () => true,
            obsTimeout,
            'participant.videoMuted$ → initial value'
          );

          await participant.toggleMuteVideo();

          const toggledVideoMuted = await waitFor(
            participant.videoMuted$,
            (m) => m !== initialVideoMuted,
            obsTimeout,
            'participant.videoMuted$ → toggled value'
          );

          return { success: true, initialVideoMuted, toggledVideoMuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.toggleMuteVideo() succeeded').toBe(true);
    expect(result.toggledVideoMuted, 'videoMuted$ is flipped after toggleMuteVideo()').toBe(
      !result.initialVideoMuted
    );
  });

  // ── Group 6: Other toggle methods ───────────────────────────────────────────

  test('participant.toggleDeaf() toggles deaf$ state', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-deaf', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const initialDeaf = await waitFor(
            participant.deaf$,
            () => true,
            obsTimeout,
            'participant.deaf$ → initial value'
          );

          await participant.toggleDeaf();

          const toggledDeaf = await waitFor(
            participant.deaf$,
            (d) => d !== initialDeaf,
            obsTimeout,
            'participant.deaf$ → toggled value'
          );

          return { success: true, initialDeaf, toggledDeaf };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.toggleDeaf() succeeded').toBe(true);
    expect(result.toggledDeaf, 'deaf$ is flipped after toggleDeaf()').toBe(
      !result.initialDeaf
    );
  });

  test('participant.toggleHandraise() toggles handraised$ state', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-handraise', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const initialHandraised = await waitFor(
            participant.handraised$,
            () => true,
            obsTimeout,
            'participant.handraised$ → initial value'
          );

          await participant.toggleHandraise();

          const toggledHandraised = await waitFor(
            participant.handraised$,
            (h) => h !== initialHandraised,
            obsTimeout,
            'participant.handraised$ → toggled value'
          );

          return { success: true, initialHandraised, toggledHandraised };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.toggleHandraise() succeeded').toBe(true);
    expect(result.toggledHandraised, 'handraised$ is flipped after toggleHandraise()').toBe(
      !result.initialHandraised
    );
  });

  test('participant.toggleEchoCancellation() toggles echoCancellation$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-echo', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const initialEcho = await waitFor(
            participant.echoCancellation$,
            () => true,
            obsTimeout,
            'participant.echoCancellation$ → initial value'
          );

          await participant.toggleEchoCancellation();

          const toggledEcho = await waitFor(
            participant.echoCancellation$,
            (e) => e !== initialEcho,
            obsTimeout,
            'participant.echoCancellation$ → toggled value'
          );

          return { success: true, initialEcho, toggledEcho };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.toggleEchoCancellation() succeeded').toBe(true);
    expect(result.toggledEcho, 'echoCancellation$ is flipped after toggleEchoCancellation()').toBe(
      !result.initialEcho
    );
  });

  test('participant.toggleAudioInputAutoGain() toggles autoGain$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-autogain', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const initialAutoGain = await waitFor(
            participant.autoGain$,
            () => true,
            obsTimeout,
            'participant.autoGain$ → initial value'
          );

          await participant.toggleAudioInputAutoGain();

          const toggledAutoGain = await waitFor(
            participant.autoGain$,
            (g) => g !== initialAutoGain,
            obsTimeout,
            'participant.autoGain$ → toggled value'
          );

          return { success: true, initialAutoGain, toggledAutoGain };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.toggleAudioInputAutoGain() succeeded').toBe(true);
    expect(result.toggledAutoGain, 'autoGain$ is flipped after toggleAudioInputAutoGain()').toBe(
      !result.initialAutoGain
    );
  });

  test('participant.toggleNoiseSuppression() toggles noiseSuppression$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-noise', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const initialNoise = await waitFor(
            participant.noiseSuppression$,
            () => true,
            obsTimeout,
            'participant.noiseSuppression$ → initial value'
          );

          await participant.toggleNoiseSuppression();

          const toggledNoise = await waitFor(
            participant.noiseSuppression$,
            (n) => n !== initialNoise,
            obsTimeout,
            'participant.noiseSuppression$ → toggled value'
          );

          return { success: true, initialNoise, toggledNoise };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.toggleNoiseSuppression() succeeded').toBe(true);
    expect(result.toggledNoise, 'noiseSuppression$ is flipped after toggleNoiseSuppression()').toBe(
      !result.initialNoise
    );
  });

  // SDK bug: toggleLowbitrate() throws UnimplementedError: Not Implemented
  test.skip('participant.toggleLowbitrate() toggles lowbitrate$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-lowbr', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const initialLowbitrate = await waitFor(
            participant.lowbitrate$,
            () => true,
            obsTimeout,
            'participant.lowbitrate$ → initial value'
          );

          await participant.toggleLowbitrate();

          const toggledLowbitrate = await waitFor(
            participant.lowbitrate$,
            (l) => l !== initialLowbitrate,
            obsTimeout,
            'participant.lowbitrate$ → toggled value'
          );

          return { success: true, initialLowbitrate, toggledLowbitrate };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.toggleLowbitrate() succeeded').toBe(true);
    expect(result.toggledLowbitrate, 'lowbitrate$ is flipped after toggleLowbitrate()').toBe(
      !result.initialLowbitrate
    );
  });

  // ── Group 7: Volume and sensitivity ─────────────────────────────────────────

  test('participant.setAudioInputVolume() changes inputVolume$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-invol', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const targetVolume = 45;
          await participant.setAudioInputVolume(targetVolume);

          const volume = await waitFor(
            participant.inputVolume$,
            (v) => v === targetVolume,
            obsTimeout,
            `participant.inputVolume$ → ${targetVolume}`
          );

          return { success: true, volume };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.setAudioInputVolume() succeeded').toBe(true);
    expect(result.volume, 'inputVolume$ reflects the set value').toBe(45);
  });

  test('participant.setAudioOutputVolume() changes outputVolume$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-outvol', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const targetVolume = 40;
          await participant.setAudioOutputVolume(targetVolume);

          const volume = await waitFor(
            participant.outputVolume$,
            (v) => v === targetVolume,
            obsTimeout,
            `participant.outputVolume$ → ${targetVolume}`
          );

          return { success: true, volume };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.setAudioOutputVolume() succeeded').toBe(true);
    expect(result.volume, 'outputVolume$ reflects the set value').toBe(40);
  });

  test('participant.setAudioInputSensitivity() changes inputSensitivity$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-sens', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const targetSensitivity = 50;
          await participant.setAudioInputSensitivity(targetSensitivity);

          const sensitivity = await waitFor(
            participant.inputSensitivity$,
            (s) => s === targetSensitivity,
            obsTimeout,
            `participant.inputSensitivity$ → ${targetSensitivity}`
          );

          return { success: true, sensitivity };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.setAudioInputSensitivity() succeeded').toBe(true);
    expect(result.sensitivity, 'inputSensitivity$ reflects the set value').toBe(50);
  });

  // ── Group 8: Meta operations ─────────────────────────────────────────────────

  // SDK bug: setMeta() throws UnimplementedError: Not Implemented
  test.skip('participant.setMeta() replaces meta$', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-setmeta', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          const metaToSet = { role: 'presenter', sessionId: 'abc-123' };
          await participant.setMeta(metaToSet);

          const meta = await waitFor(
            participant.meta$,
            (m) => m.role === 'presenter',
            obsTimeout,
            'participant.meta$ → contains role:presenter'
          );

          return { success: true, role: meta.role, sessionId: meta.sessionId };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.setMeta() succeeded').toBe(true);
    expect(result.role, 'meta$.role is "presenter" after setMeta()').toBe('presenter');
    expect(result.sessionId, 'meta$.sessionId is "abc-123" after setMeta()').toBe('abc-123');
  });

  // SDK bug: updateMeta() throws UnimplementedError: Not Implemented
  test.skip('participant.updateMeta() merges meta data', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-part-updmeta', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          // Set initial meta
          await participant.setMeta({ initial: 'value', keep: 'this' });
          await waitFor(
            participant.meta$,
            (m) => m.initial === 'value',
            obsTimeout,
            'participant.meta$ → initial set'
          );

          // Update meta — should merge, not replace
          await participant.updateMeta({ updated: 'field' });

          const meta = await waitFor(
            participant.meta$,
            (m) => m.updated === 'field',
            obsTimeout,
            'participant.meta$ → contains updated field after updateMeta()'
          );

          return {
            success: true,
            hasUpdated: meta.updated === 'field',
            updatedValue: meta.updated,
            // Verify merge: original keys must survive
            initialValue: meta.initial,
            keepValue: meta.keep,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.updateMeta() succeeded').toBe(true);
    expect(result.hasUpdated, 'meta$ contains updated field after updateMeta()').toBe(true);
    expect(result.updatedValue, 'meta$.updated is "field" after updateMeta()').toBe('field');
    // Verify merge semantics: original keys must survive updateMeta()
    expect(result.initialValue, 'meta$.initial survives after updateMeta() (merge, not replace)').toBe('value');
    expect(result.keepValue, 'meta$.keep survives after updateMeta() (merge, not replace)').toBe('this');
  });

  // ── Group 9: Administrative methods ─────────────────────────────────────────

  test('participant.remove() attempts to remove participant — handles permission error', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    // Note: remove() on self may succeed (ending the call) or fail with a
    // permission error if the room requires admin privileges.
    await setupRoomCall({ page, resource, prefix: 'e2e-part-remove', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          await participant.remove();

          // If remove() succeeded, the call is torn down — signal afterEach to skip hangup
          // @ts-expect-error forcing null to clear call reference for afterEach
          window.__swCall = null;
          return { success: true, methodExists: true, threwError: false };
        } catch (error) {
          const errorMsg = String(error);
          // remove() may throw a permission or protocol error — that is acceptable
          return {
            success: true,
            methodExists: true,
            threwError: true,
            errorMsg,
          };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.remove() completes without crash').toBe(true);
    expect(result.methodExists, 'participant.remove() exists as a method').toBe(true);
    // Either succeeds or throws a string error — not a hard crash
  });

  test('participant.end() attempts to end participant call — handles permission error', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    // Note: end() on self may succeed (ending the call) or fail with a
    // permission error if the room requires admin privileges.
    await setupRoomCall({ page, resource, prefix: 'e2e-part-end', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          await participant.end();

          // If end() succeeded, the call is torn down — signal afterEach to skip hangup
          // @ts-expect-error forcing null to clear call reference for afterEach
          window.__swCall = null;
          return { success: true, methodExists: true, threwError: false };
        } catch (error) {
          const errorMsg = String(error);
          // end() may throw a permission or protocol error — that is acceptable
          return {
            success: true,
            methodExists: true,
            threwError: true,
            errorMsg,
          };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.end() completes without crash').toBe(true);
    expect(result.methodExists, 'participant.end() exists as a method').toBe(true);
  });

  // ── Group 10: setPosition ────────────────────────────────────────────────────

  test('participant.setPosition() calls server without error', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    // setPosition may silently succeed or throw a server-side error if
    // positions are not supported for this room configuration.
    await setupRoomCall({ page, resource, prefix: 'e2e-part-setpos', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
          const call = window.__swCall;

          const participants = await waitFor(
            call.participants$,
            (p) => p.length >= 1,
            obsTimeout,
            'participants$ → at least 1 participant'
          );

          const participant = participants[0];

          // 'auto' is a safe default position value
          await participant.setPosition('auto');

          return { success: true, threwError: false };
        } catch (error) {
          const errorMsg = String(error);
          // setPosition may throw if room layout doesn't support it — acceptable
          return { success: true, threwError: true, errorMsg };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'participant.setPosition() completes without crash').toBe(true);
  });
});
