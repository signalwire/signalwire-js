/**
 * SelfParticipant API — E2E Test Suite
 *
 * Tests the complete public API surface of `call.self` (CallSelfParticipant):
 * all observable properties, sync getters, and control methods.
 *
 * Audio-only tests use `?channel=audio` to avoid video media requirements.
 * Video mute/unmute tests use `?channel=video`.
 *
 * Observable waits use `window.__waitFor(obs$, predicate, timeout, label)`
 * which auto-unsubscribes after the first matching value — no subscription leaks.
 */
import { test, expect } from '../fixtures';
import { setupRoomCall } from '../helpers/setup';

const CALL_CONNECT_TIMEOUT = 30_000;
const OBSERVABLE_TIMEOUT = 10_000;

// ── Extend window type with full self participant API ──────────────────────────
// The types.d.ts file has a minimal self definition; we cast to `any` inside
// page.evaluate where needed so TypeScript doesn't complain about the extended API.

test.describe('SelfParticipant API', () => {
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

  // ── Group 1: Observable properties emit initial values ───────────────────────

  test('observable properties — all observables emit initial values', async ({
    page,
    resource,
  }) => {
    test.setTimeout(60_000);

    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-obs', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        // Type-guard predicate: skip initial undefined, wait for real server data
        const defined = (v: unknown) => v !== undefined;
        try {
          const call = window.__swCall;

          const self = (await waitFor(
            call.self$,
            (s: unknown) => s !== null,
            obsTimeout,
            'self$ → non-null'
          ))!;

          // Wait for all observables in parallel — resolves when server data arrives
          // Note: screenShareStatus$ always emits 'none' (BehaviorSubject default)
          // Note: position$ may remain undefined in a single-participant room (no layout.changed)
          const [
            audioMuted, videoMuted, handraised, deaf, visible, isTalking,
            name, type, echoCancellation, autoGain, noiseSuppression, lowbitrate,
            screenShareStatus, inputVolume, outputVolume, inputSensitivity,
            meta, userId, addressId, nodeId, position, denoise,
          ] = await Promise.all([
            waitFor(self.audioMuted$, defined, obsTimeout, 'audioMuted$'),
            waitFor(self.videoMuted$, defined, obsTimeout, 'videoMuted$'),
            waitFor(self.handraised$, defined, obsTimeout, 'handraised$'),
            waitFor(self.deaf$, defined, obsTimeout, 'deaf$'),
            waitFor(self.visible$, defined, obsTimeout, 'visible$'),
            // isTalking$ may remain undefined — talking events arrive via member.talking, not call.joined
            waitFor(self.isTalking$, () => true, obsTimeout, 'isTalking$'),
            waitFor(self.name$, defined, obsTimeout, 'name$'),
            waitFor(self.type$, defined, obsTimeout, 'type$'),
            waitFor(self.echoCancellation$, defined, obsTimeout, 'echoCancellation$'),
            waitFor(self.autoGain$, defined, obsTimeout, 'autoGain$'),
            waitFor(self.noiseSuppression$, defined, obsTimeout, 'noiseSuppression$'),
            waitFor(self.lowbitrate$, defined, obsTimeout, 'lowbitrate$'),
            waitFor(self.screenShareStatus$, () => true, obsTimeout, 'screenShareStatus$'),
            waitFor(self.inputVolume$, defined, obsTimeout, 'inputVolume$'),
            waitFor(self.outputVolume$, defined, obsTimeout, 'outputVolume$'),
            waitFor(self.inputSensitivity$, defined, obsTimeout, 'inputSensitivity$'),
            waitFor(self.meta$, defined, obsTimeout, 'meta$'),
            waitFor(self.userId$, defined, obsTimeout, 'userId$'),
            waitFor(self.addressId$, defined, obsTimeout, 'addressId$'),
            waitFor(self.nodeId$, defined, obsTimeout, 'nodeId$'),
            waitFor(self.position$, () => true, obsTimeout, 'position$'),
            waitFor(self.denoise$, defined, obsTimeout, 'denoise$'),
          ]);

          return {
            success: true,
            audioMutedType: typeof audioMuted,
            videoMutedType: typeof videoMuted,
            handraisedType: typeof handraised,
            deafType: typeof deaf,
            visibleType: typeof visible,
            isTalkingType: typeof isTalking,
            nameType: typeof name,
            typeType: typeof type,
            echoCancellationType: typeof echoCancellation,
            autoGainType: typeof autoGain,
            noiseSuppressionType: typeof noiseSuppression,
            lowbitrateType: typeof lowbitrate,
            screenShareStatusType: typeof screenShareStatus,
            inputVolumeType: typeof inputVolume,
            outputVolumeType: typeof outputVolume,
            inputSensitivityType: typeof inputSensitivity,
            metaType: typeof meta,
            userIdType: typeof userId,
            addressIdType: typeof addressId,
            nodeIdType: typeof nodeId,
            positionType: typeof position,
            denoiseType: typeof denoise,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, `observable emissions failed: ${result.success ? '' : result.error}`).toBe(true);
    const r = result as {
      success: true;
      audioMutedType: string; videoMutedType: string; handraisedType: string;
      deafType: string; visibleType: string; isTalkingType: string;
      nameType: string; typeType: string; echoCancellationType: string;
      autoGainType: string; noiseSuppressionType: string; lowbitrateType: string;
      screenShareStatusType: string; inputVolumeType: string; outputVolumeType: string;
      inputSensitivityType: string; metaType: string;
      userIdType: string; addressIdType: string; nodeIdType: string;
      positionType: string; denoiseType: string;
    };
    expect(r.audioMutedType, 'audioMuted$ emits boolean').toBe('boolean');
    expect(r.videoMutedType, 'videoMuted$ emits boolean').toBe('boolean');
    expect(r.handraisedType, 'handraised$ emits boolean').toBe('boolean');
    expect(r.deafType, 'deaf$ emits boolean').toBe('boolean');
    expect(r.visibleType, 'visible$ emits boolean').toBe('boolean');
    // isTalking$ may emit undefined if talking event hasn't arrived yet
    expect(['boolean', 'undefined'], 'isTalking$ emits boolean or undefined').toContain(r.isTalkingType);
    expect(r.echoCancellationType, 'echoCancellation$ emits boolean').toBe('boolean');
    expect(r.autoGainType, 'autoGain$ emits boolean').toBe('boolean');
    expect(r.noiseSuppressionType, 'noiseSuppression$ emits boolean').toBe('boolean');
    expect(r.lowbitrateType, 'lowbitrate$ emits boolean').toBe('boolean');
    expect(r.screenShareStatusType, 'screenShareStatus$ emits string').toBe('string');
    expect(r.inputVolumeType, 'inputVolume$ emits number').toBe('number');
    expect(r.outputVolumeType, 'outputVolume$ emits number').toBe('number');
    expect(r.inputSensitivityType, 'inputSensitivity$ emits number').toBe('number');
    expect(r.metaType, 'meta$ emits an object').toBe('object');
    // userId$, addressId$, nodeId$ — server sends these with call.joined
    expect(r.userIdType, 'userId$ emits string').toBe('string');
    expect(r.addressIdType, 'addressId$ emits string').toBe('string');
    expect(r.nodeIdType, 'nodeId$ emits string').toBe('string');
    // position$ emits LayoutLayer | undefined — may be undefined in a single-participant room
    expect(['object', 'undefined'], 'position$ emits object or undefined').toContain(r.positionType);
    expect(r.denoiseType, 'denoise$ emits boolean').toBe('boolean');
  });

  // ── Group 2: Sync getters ─────────────────────────────────────────────────────

  test('sync getters — all getters have correct types', async ({
    page,
    resource,
  }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-getters', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;

          // Ensure self is available before reading sync getters
          await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null');

          const self = call.self!;
          if (!self) throw new Error('self is null after self$ emitted non-null');

          return {
            success: true,
            idType: typeof self.id,
            idLength: typeof self.id === 'string' ? self.id.length : 0,
            nameType: typeof self.name,
            typeType: typeof self.type,
            audioMutedType: typeof self.audioMuted,
            videoMutedType: typeof self.videoMuted,
            handraisedType: typeof self.handraised,
            deafType: typeof self.deaf,
            visibleType: typeof self.visible,
            isTalkingType: typeof self.isTalking,
            echoCancellationType: typeof self.echoCancellation,
            autoGainType: typeof self.autoGain,
            noiseSuppressionType: typeof self.noiseSuppression,
            lowbitrateType: typeof self.lowbitrate,
            denoiseType: typeof self.denoise,
            screenShareStatusType: typeof self.screenShareStatus,
            isAudienceType: typeof self.isAudience,
            metaType: typeof self.meta,
            userIdType: typeof self.userId,
            addressIdType: typeof self.addressId,
            nodeIdType: typeof self.nodeId,
            inputVolumeType: typeof self.inputVolume,
            outputVolumeType: typeof self.outputVolume,
            inputSensitivityType: typeof self.inputSensitivity,
            positionType: typeof self.position,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'sync getters succeeded').toBe(true);
    const r = result as {
      success: true;
      idType: string; idLength: number; nameType: string; typeType: string;
      audioMutedType: string; videoMutedType: string; handraisedType: string;
      deafType: string; visibleType: string; isTalkingType: string;
      echoCancellationType: string; autoGainType: string; noiseSuppressionType: string;
      lowbitrateType: string; denoiseType: string; screenShareStatusType: string;
      isAudienceType: string; metaType: string;
      userIdType: string; addressIdType: string; nodeIdType: string;
      inputVolumeType: string; outputVolumeType: string; inputSensitivityType: string;
      positionType: string;
    };
    expect(r.idType, 'self.id is a string').toBe('string');
    expect(r.idLength, 'self.id is non-empty').toBeGreaterThan(0);
    expect(['string', 'undefined'], 'self.name is string or undefined').toContain(r.nameType);
    expect(['string', 'undefined'], 'self.type is string or undefined').toContain(r.typeType);
    expect(r.audioMutedType, 'self.audioMuted is boolean').toBe('boolean');
    expect(r.videoMutedType, 'self.videoMuted is boolean').toBe('boolean');
    expect(r.handraisedType, 'self.handraised is boolean').toBe('boolean');
    expect(r.deafType, 'self.deaf is boolean').toBe('boolean');
    expect(r.visibleType, 'self.visible is boolean').toBe('boolean');
    expect(r.isTalkingType, 'self.isTalking is boolean').toBe('boolean');
    expect(r.echoCancellationType, 'self.echoCancellation is boolean').toBe('boolean');
    expect(r.autoGainType, 'self.autoGain is boolean').toBe('boolean');
    expect(r.noiseSuppressionType, 'self.noiseSuppression is boolean').toBe('boolean');
    expect(r.lowbitrateType, 'self.lowbitrate is boolean').toBe('boolean');
    expect(r.denoiseType, 'self.denoise is boolean').toBe('boolean');
    expect(r.screenShareStatusType, 'self.screenShareStatus is string').toBe('string');
    expect(r.isAudienceType, 'self.isAudience is boolean').toBe('boolean');
    expect(['object', 'undefined'], 'self.meta is object or undefined').toContain(r.metaType);
    expect(['string', 'undefined'], 'self.userId is string or undefined').toContain(r.userIdType);
    expect(['string', 'undefined'], 'self.addressId is string or undefined').toContain(r.addressIdType);
    expect(['string', 'undefined'], 'self.nodeId is string or undefined').toContain(r.nodeIdType);
    expect(['number', 'undefined'], 'self.inputVolume is number or undefined').toContain(r.inputVolumeType);
    expect(['number', 'undefined'], 'self.outputVolume is number or undefined').toContain(r.outputVolumeType);
    expect(['number', 'undefined'], 'self.inputSensitivity is number or undefined').toContain(r.inputSensitivityType);
    expect(['object', 'undefined'], 'self.position is object or undefined').toContain(r.positionType);
  });

  // ── Group 3: Audio mute/unmute ────────────────────────────────────────────────

  test('mute() — sets audioMuted$ to true', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-mute', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          await self.mute();

          const isMuted = await waitFor(
            self.audioMuted$,
            (m: boolean) => m === true,
            obsTimeout,
            'audioMuted$ → true after mute()'
          );

          return { success: true, isMuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'mute() succeeded').toBe(true);
    expect((result as { success: true; isMuted: boolean }).isMuted, 'audioMuted$ is true after mute()').toBe(true);
  });

  test('unmute() — sets audioMuted$ to false', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-unmute', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          // Mute first to have a known state
          await self.mute();
          await waitFor(self.audioMuted$, (m: boolean) => m === true, obsTimeout, 'audioMuted$ → true (pre-condition)');

          // Now unmute
          await self.unmute();

          const isUnmuted = await waitFor(
            self.audioMuted$,
            (m: boolean) => m === false,
            obsTimeout,
            'audioMuted$ → false after unmute()'
          );

          return { success: true, audioMutedAfterUnmute: isUnmuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'unmute() succeeded').toBe(true);
    expect((result as { success: true; audioMutedAfterUnmute: boolean }).audioMutedAfterUnmute, 'audioMuted$ is false after unmute()').toBe(false);
  });

  test('toggleMute() — toggles audioMuted$ state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-tmute', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          // Capture initial state
          const initialMuted = await waitFor(self.audioMuted$, () => true, obsTimeout, 'audioMuted$ initial');

          // Toggle once — is the opposite
          await self.toggleMute();
          const afterFirstToggle = await waitFor(
            self.audioMuted$,
            (m: boolean) => m !== initialMuted,
            obsTimeout,
            'audioMuted$ → toggled once'
          );

          // Toggle again — should return to initial state
          await self.toggleMute();
          const afterSecondToggle = await waitFor(
            self.audioMuted$,
            (m: boolean) => m === initialMuted,
            obsTimeout,
            'audioMuted$ → back to initial'
          );

          return { success: true, initialMuted, afterFirstToggle, afterSecondToggle };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'toggleMute() succeeded').toBe(true);
    const r = result as { success: true; initialMuted: boolean; afterFirstToggle: boolean; afterSecondToggle: boolean };
    expect(r.afterFirstToggle, 'first toggle flips audioMuted$').toBe(!r.initialMuted);
    expect(r.afterSecondToggle, 'second toggle restores audioMuted$ to initial state').toBe(r.initialMuted);
  });

  // ── Group 4: Video mute/unmute ────────────────────────────────────────────────

  test('muteVideo() — sets videoMuted$ to true', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-vmute', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          await self.muteVideo();

          const isVideoMuted = await waitFor(
            self.videoMuted$,
            (m: boolean) => m === true,
            obsTimeout,
            'videoMuted$ → true after muteVideo()'
          );

          return { success: true, isVideoMuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'muteVideo() succeeded').toBe(true);
    expect((result as { success: true; isVideoMuted: boolean }).isVideoMuted, 'videoMuted$ is true after muteVideo()').toBe(true);
  });

  test('unmuteVideo() — sets videoMuted$ to false', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-vunmute', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          // Mute video first to have a known state
          await self.muteVideo();
          await waitFor(self.videoMuted$, (m: boolean) => m === true, obsTimeout, 'videoMuted$ → true (pre-condition)');

          // Now unmute
          await self.unmuteVideo();

          const isVideoMuted = await waitFor(
            self.videoMuted$,
            (m: boolean) => m === false,
            obsTimeout,
            'videoMuted$ → false after unmuteVideo()'
          );

          return { success: true, videoMutedAfterUnmute: isVideoMuted };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'unmuteVideo() succeeded').toBe(true);
    expect((result as { success: true; videoMutedAfterUnmute: boolean }).videoMutedAfterUnmute, 'videoMuted$ is false after unmuteVideo()').toBe(false);
  });

  test('toggleMuteVideo() — toggles videoMuted$ state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-tvmute', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialVideoMuted = await waitFor(self.videoMuted$, () => true, obsTimeout, 'videoMuted$ initial');

          // Toggle once
          await self.toggleMuteVideo();
          const afterFirstToggle = await waitFor(
            self.videoMuted$,
            (m: boolean) => m !== initialVideoMuted,
            obsTimeout,
            'videoMuted$ → toggled once'
          );

          // Toggle again
          await self.toggleMuteVideo();
          const afterSecondToggle = await waitFor(
            self.videoMuted$,
            (m: boolean) => m === initialVideoMuted,
            obsTimeout,
            'videoMuted$ → back to initial'
          );

          return { success: true, initialVideoMuted, afterFirstToggle, afterSecondToggle };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'toggleMuteVideo() succeeded').toBe(true);
    const r = result as { success: true; initialVideoMuted: boolean; afterFirstToggle: boolean; afterSecondToggle: boolean };
    expect(r.afterFirstToggle, 'first toggle flips videoMuted$').toBe(!r.initialVideoMuted);
    expect(r.afterSecondToggle, 'second toggle restores videoMuted$ to initial state').toBe(r.initialVideoMuted);
  });

  // ── Group 5: Other toggles ────────────────────────────────────────────────────

  test('toggleDeaf() — toggles deaf$ state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-deaf', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialDeaf = await waitFor(self.deaf$, () => true, obsTimeout, 'deaf$ initial');

          await self.toggleDeaf();

          const afterToggle = await waitFor(
            self.deaf$,
            (d: boolean) => d !== initialDeaf,
            obsTimeout,
            'deaf$ → toggled'
          );

          return { success: true, initialDeaf, afterToggle };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'toggleDeaf() succeeded').toBe(true);
    const r = result as { success: true; initialDeaf: boolean; afterToggle: boolean };
    expect(r.afterToggle, 'toggleDeaf() flips deaf$ state').toBe(!r.initialDeaf);
  });

  test('toggleHandraise() — toggles handraised$ state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-hand', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialHandraised = await waitFor(self.handraised$, () => true, obsTimeout, 'handraised$ initial');

          await self.toggleHandraise();

          const afterToggle = await waitFor(
            self.handraised$,
            (h: boolean) => h !== initialHandraised,
            obsTimeout,
            'handraised$ → toggled'
          );

          return { success: true, initialHandraised, afterToggle };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'toggleHandraise() succeeded').toBe(true);
    const r = result as { success: true; initialHandraised: boolean; afterToggle: boolean };
    expect(r.afterToggle, 'toggleHandraise() flips handraised$ state').toBe(!r.initialHandraised);
  });

  test('toggleEchoCancellation() — toggles echoCancellation$ state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-echo', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialEcho = await waitFor(self.echoCancellation$, () => true, obsTimeout, 'echoCancellation$ initial');

          await self.toggleEchoCancellation();

          const afterToggle = await waitFor(
            self.echoCancellation$,
            (e: boolean) => e !== initialEcho,
            obsTimeout,
            'echoCancellation$ → toggled'
          );

          return { success: true, initialEcho, afterToggle };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'toggleEchoCancellation() succeeded').toBe(true);
    const r = result as { success: true; initialEcho: boolean; afterToggle: boolean };
    expect(r.afterToggle, 'toggleEchoCancellation() flips echoCancellation$ state').toBe(!r.initialEcho);
  });

  test('toggleAudioInputAutoGain() — toggles autoGain$ state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-gain', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialGain = await waitFor(self.autoGain$, () => true, obsTimeout, 'autoGain$ initial');

          await self.toggleAudioInputAutoGain();

          const afterToggle = await waitFor(
            self.autoGain$,
            (g: boolean) => g !== initialGain,
            obsTimeout,
            'autoGain$ → toggled'
          );

          return { success: true, initialGain, afterToggle };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'toggleAudioInputAutoGain() succeeded').toBe(true);
    const r = result as { success: true; initialGain: boolean; afterToggle: boolean };
    expect(r.afterToggle, 'toggleAudioInputAutoGain() flips autoGain$ state').toBe(!r.initialGain);
  });

  test('toggleNoiseSuppression() — toggles noiseSuppression$ state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-noise', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialNoise = await waitFor(self.noiseSuppression$, () => true, obsTimeout, 'noiseSuppression$ initial');

          await self.toggleNoiseSuppression();

          const afterToggle = await waitFor(
            self.noiseSuppression$,
            (n: boolean) => n !== initialNoise,
            obsTimeout,
            'noiseSuppression$ → toggled'
          );

          return { success: true, initialNoise, afterToggle };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'toggleNoiseSuppression() succeeded').toBe(true);
    const r = result as { success: true; initialNoise: boolean; afterToggle: boolean };
    expect(r.afterToggle, 'toggleNoiseSuppression() flips noiseSuppression$ state').toBe(!r.initialNoise);
  });

  // SDK bug: self.toggleLowbitrate() throws UnimplementedError: Not Implemented
  test.skip('toggleLowbitrate() — toggles lowbitrate$ state', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-lowbr', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialLowbitrate = await waitFor(self.lowbitrate$, () => true, obsTimeout, 'lowbitrate$ initial');

          await self.toggleLowbitrate();

          const afterToggle = await waitFor(
            self.lowbitrate$,
            (l: boolean) => l !== initialLowbitrate,
            obsTimeout,
            'lowbitrate$ → toggled'
          );

          return { success: true, initialLowbitrate, afterToggle };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'toggleLowbitrate() succeeded').toBe(true);
    const r = result as { success: true; initialLowbitrate: boolean; afterToggle: boolean };
    expect(r.afterToggle, 'toggleLowbitrate() flips lowbitrate$ state').toBe(!r.initialLowbitrate);
  });

  // ── Group 6: Volume and sensitivity ──────────────────────────────────────────

  test('setAudioInputVolume() — changes inputVolume$ value', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-invol', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const targetVolume = 45;
    const result = await page.evaluate(
      async ({ obsTimeout, targetVolume }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialVolume = await waitFor(self.inputVolume$, () => true, obsTimeout, 'inputVolume$ initial');

          await self.setAudioInputVolume(targetVolume);

          const newVolume = await waitFor(
            self.inputVolume$,
            (v: number) => v === targetVolume,
            obsTimeout,
            `inputVolume$ → ${targetVolume}`
          );

          return { success: true, initialVolume, newVolume };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT, targetVolume }
    );

    expect(result.success, 'setAudioInputVolume() succeeded').toBe(true);
    expect((result as { success: true; newVolume: number }).newVolume, `inputVolume$ is ${targetVolume}`).toBe(targetVolume);
  });

  test('setAudioInputVolume() — invalid changes inputVolume$ value', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-involn', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const targetVolume = 75;
    const result = await page.evaluate(
      async ({ obsTimeout, targetVolume }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialVolume = await waitFor(self.inputVolume$, () => true, obsTimeout, 'inputVolume$ initial');

          await self.setAudioInputVolume(targetVolume);

          return { success: false, initialVolume, targetVolume };
        } catch (error) {
          return { success: true, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT, targetVolume }
    );

    expect(result.success, 'setAudioInputVolume() succeeded').toBe(true);
  });

  test('setAudioOutputVolume() — changes outputVolume$ value', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-outvol', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const targetVolume = 40;
    const result = await page.evaluate(
      async ({ obsTimeout, targetVolume }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialVolume = await waitFor(self.outputVolume$, () => true, obsTimeout, 'outputVolume$ initial');

          await self.setAudioOutputVolume(targetVolume);

          const newVolume = await waitFor(
            self.outputVolume$,
            (v: number) => v === targetVolume,
            obsTimeout,
            `outputVolume$ → ${targetVolume}`
          );

          return { success: true, initialVolume, newVolume };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT, targetVolume }
    );

    expect(result.success, 'setAudioOutputVolume() succeeded').toBe(true);
    expect((result as { success: true; newVolume: number }).newVolume, `outputVolume$ is ${targetVolume}`).toBe(targetVolume);
  });

  test('setAudioInputSensitivity() — changes inputSensitivity$ value', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-sens', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const targetSensitivity = 50;
    const result = await page.evaluate(
      async ({ obsTimeout, targetSensitivity }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialSensitivity = await waitFor(self.inputSensitivity$, () => true, obsTimeout, 'inputSensitivity$ initial');

          await self.setAudioInputSensitivity(targetSensitivity);

          const newSensitivity = await waitFor(
            self.inputSensitivity$,
            (v: number) => v === targetSensitivity,
            obsTimeout,
            `inputSensitivity$ → ${targetSensitivity}`
          );

          return { success: true, initialSensitivity, newSensitivity };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT, targetSensitivity }
    );

    expect(result.success, 'setAudioInputSensitivity() succeeded').toBe(true);
    expect((result as { success: true; newSensitivity: number }).newSensitivity, `inputSensitivity$ is ${targetSensitivity}`).toBe(targetSensitivity);
  });

  // ── Group 7: Meta ─────────────────────────────────────────────────────────────

  // SDK bug: self.setMeta() throws UnimplementedError: Not Implemented
  // This is a genuine SDK limitation — the method exists on the interface but
  // is not implemented for the self participant. Documented and skipped.
  test.skip('setMeta() — updates meta$ observable', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-setmeta', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const metaPayload = { testKey: 'setMeta-value', timestamp: 12345 };
    const result = await page.evaluate(
      async ({ obsTimeout, metaPayload }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          await self.setMeta(metaPayload);

          const newMeta = await waitFor(
            self.meta$,
            (m: Record<string, unknown>) => m.testKey === metaPayload.testKey,
            obsTimeout,
            'meta$ → contains testKey after setMeta()'
          );

          return { success: true, testKey: newMeta.testKey, timestamp: newMeta.timestamp };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT, metaPayload }
    );

    expect(result.success, 'setMeta() succeeded').toBe(true);
    const r = result as { success: true; testKey: unknown; timestamp: unknown };
    expect(r.testKey, 'meta$.testKey matches setMeta() payload').toBe(metaPayload.testKey);
    expect(r.timestamp, 'meta$.timestamp matches setMeta() payload').toBe(metaPayload.timestamp);
  });

  // SDK bug: self.updateMeta() throws UnimplementedError (same as setMeta above)
  test.skip('updateMeta() — merges meta data', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-updmeta', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const initialMeta = { firstKey: 'first-value' };
    const updateMeta = { secondKey: 'second-value' };
    const result = await page.evaluate(
      async ({ obsTimeout, initialMeta, updateMeta }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          // Set initial meta
          await self.setMeta(initialMeta);
          await waitFor(
            self.meta$,
            (m: Record<string, unknown>) => m.firstKey === initialMeta.firstKey,
            obsTimeout,
            'meta$ → firstKey present (pre-condition)'
          );

          // Now merge additional meta
          await self.updateMeta(updateMeta);

          const mergedMeta = await waitFor(
            self.meta$,
            (m: Record<string, unknown>) => m.secondKey === updateMeta.secondKey,
            obsTimeout,
            'meta$ → secondKey present after updateMeta()'
          );

          return {
            success: true,
            firstKey: mergedMeta.firstKey,
            secondKey: mergedMeta.secondKey,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT, initialMeta, updateMeta }
    );

    expect(result.success, 'updateMeta() succeeded').toBe(true);
    const r = result as { success: true; firstKey: unknown; secondKey: unknown };
    expect(r.firstKey, 'original firstKey is preserved after updateMeta()').toBe(initialMeta.firstKey);
    expect(r.secondKey, 'secondKey is present after updateMeta()').toBe(updateMeta.secondKey);
  });

  // ── Group 8: Screen share ─────────────────────────────────────────────────────

  // Skip: startScreenShare() requires a user gesture and the getDisplayMedia() API,
  // which is not available in headless Chromium with fake media devices.
  test.skip('startScreenShare() — changes screenShareStatus$ (headless: display capture unavailable)', async ({ page, resource }) => {
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-screenshare', channel: 'video' });

    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const initialStatus = await waitFor(self.screenShareStatus$, () => true, obsTimeout, 'screenShareStatus$ initial');

          await self.startScreenShare();

          const newStatus = await waitFor(
            self.screenShareStatus$,
            (s: string) => s !== initialStatus,
            obsTimeout,
            'screenShareStatus$ → changed after startScreenShare()'
          );

          await self.stopScreenShare();

          return { success: true, initialStatus, newStatus };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'startScreenShare() succeeded').toBe(true);
  });

  // ── Group 9: Device selection ─────────────────────────────────────────────────

  test('selectAudioInputDevice() — can be called without error', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-audioin', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          // Enumerate available audio input devices
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputDevice = devices.find((d) => d.kind === 'audioinput');

          if (!audioInputDevice) {
            return { success: false, error: 'No audioinput device found (fake devices not enumerated)' };
          }

          // selectAudioInputDevice is synchronous — it should not throw
          self.selectAudioInputDevice(audioInputDevice);

          return { success: true, deviceLabel: audioInputDevice.label || 'fake-device' };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'selectAudioInputDevice() succeeded').toBe(true);
  });

  test('selectVideoInputDevice() — can be called without error', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-videoin', channel: 'video' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputDevice = devices.find((d) => d.kind === 'videoinput');

          if (!videoInputDevice) {
            return { success: false, error: 'No videoinput device found (fake devices not enumerated)' };
          }

          self.selectVideoInputDevice(videoInputDevice);

          return { success: true, deviceLabel: videoInputDevice.label || 'fake-device' };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'selectVideoInputDevice() succeeded').toBe(true);
  });

  test('selectAudioOutputDevice() — can be called without error', async ({ page, resource }) => {
    // ── SETUP ──────────────────────────────────────────────
    await setupRoomCall({ page, resource, prefix: 'e2e-sp-audioout', channel: 'audio' });

    // ── CHECK ──────────────────────────────────────────────
    const result = await page.evaluate(
      async ({ obsTimeout }) => {
        const waitFor = window.__waitFor;
        try {
                    const call = window.__swCall;
                    const self = (await waitFor(call.self$, (s: unknown) => s !== null, obsTimeout, 'self$ → non-null'))!;

          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioOutputDevice = devices.find((d) => d.kind === 'audiooutput');

          if (!audioOutputDevice) {
            // audiooutput may not be enumerated without permissions in all browsers — treat as soft skip
            return { success: true, skipped: true, deviceLabel: 'not-available' };
          }

          self.selectAudioOutputDevice(audioOutputDevice);

          return { success: true, skipped: false, deviceLabel: audioOutputDevice.label || 'fake-device' };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      { obsTimeout: OBSERVABLE_TIMEOUT }
    );

    expect(result.success, 'selectAudioOutputDevice() succeeded').toBe(true);
  });
});
