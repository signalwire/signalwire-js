import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom, map } from 'rxjs';

import { SelfCapabilities } from './SelfCapabilities';
import { DEFAULT_CALL_CAPABILITIES, DEFAULT_MEMBER_CAPABILITIES, DEFAULT_ON_OFF } from './types';

describe('SelfCapabilities', () => {
  let capabilities: SelfCapabilities;

  beforeEach(() => {
    capabilities = new SelfCapabilities();
  });

  describe('initial state', () => {
    it('should start with default capabilities', () => {
      expect(capabilities.state).toEqual(DEFAULT_CALL_CAPABILITIES);
    });

    it('should emit default state on state$', async () => {
      const state = await firstValueFrom(capabilities.state$);
      expect(state).toEqual(DEFAULT_CALL_CAPABILITIES);
    });
  });

  describe('updateFromRaw', () => {
    it('should update state from raw capabilities', () => {
      capabilities.updateFromRaw(['self', 'end', 'device']);

      expect(capabilities.end).toBe(true);
      expect(capabilities.device).toBe(true);
      expect(capabilities.self.muteAudio.on).toBe(true);
      expect(capabilities.self.muteAudio.off).toBe(true);
    });

    it('should completely replace state on subsequent updates', () => {
      // First update with many capabilities
      capabilities.updateFromRaw(['self', 'member', 'end', 'device', 'screenshare', 'lock']);
      expect(capabilities.end).toBe(true);
      expect(capabilities.device).toBe(true);
      expect(capabilities.screenshare).toBe(true);
      expect(capabilities.lock.on).toBe(true);

      // Second update with fewer capabilities
      capabilities.updateFromRaw(['device']);
      expect(capabilities.end).toBe(false);
      expect(capabilities.device).toBe(true);
      expect(capabilities.screenshare).toBe(false);
      expect(capabilities.lock).toEqual(DEFAULT_ON_OFF);
      expect(capabilities.self).toEqual(DEFAULT_MEMBER_CAPABILITIES);
      expect(capabilities.member).toEqual(DEFAULT_MEMBER_CAPABILITIES);
    });

    it('should reset to defaults on empty capabilities', () => {
      capabilities.updateFromRaw(['self', 'end']);
      expect(capabilities.end).toBe(true);

      capabilities.updateFromRaw([]);
      expect(capabilities.state).toEqual(DEFAULT_CALL_CAPABILITIES);
    });
  });

  describe('call-level capability getters', () => {
    beforeEach(() => {
      capabilities.updateFromRaw([
        'end',
        'device',
        'screenshare',
        'layout',
        'digit',
        'vmuted',
        'lock'
      ]);
    });

    it('should return end capability', () => {
      expect(capabilities.end).toBe(true);
    });

    it('should return device capability', () => {
      expect(capabilities.device).toBe(true);
    });

    it('should return screenshare capability', () => {
      expect(capabilities.screenshare).toBe(true);
    });

    it('should return setLayout capability', () => {
      expect(capabilities.setLayout).toBe(true);
    });

    it('should return sendDigit capability', () => {
      expect(capabilities.sendDigit).toBe(true);
    });

    it('should return vmutedHide capability', () => {
      expect(capabilities.vmutedHide.on).toBe(true);
      expect(capabilities.vmutedHide.off).toBe(true);
    });

    it('should return lock capability', () => {
      expect(capabilities.lock.on).toBe(true);
      expect(capabilities.lock.off).toBe(true);
    });
  });

  describe('self member capability getters', () => {
    beforeEach(() => {
      capabilities.updateFromRaw(['self']);
    });

    it('should return self.muteAudio', () => {
      expect(capabilities.self.muteAudio.on).toBe(true);
      expect(capabilities.self.muteAudio.off).toBe(true);
    });

    it('should return self.muteVideo', () => {
      expect(capabilities.self.muteVideo.on).toBe(true);
      expect(capabilities.self.muteVideo.off).toBe(true);
    });

    it('should return self.deaf', () => {
      expect(capabilities.self.deaf.on).toBe(true);
      expect(capabilities.self.deaf.off).toBe(true);
    });

    it('should return self.raisehand', () => {
      expect(capabilities.self.raisehand.on).toBe(true);
      expect(capabilities.self.raisehand.off).toBe(true);
    });

    it('should return self.microphoneVolume', () => {
      expect(capabilities.self.microphoneVolume).toBe(true);
    });

    it('should return self.microphoneSensitivity', () => {
      expect(capabilities.self.microphoneSensitivity).toBe(true);
    });

    it('should return self.speakerVolume', () => {
      expect(capabilities.self.speakerVolume).toBe(true);
    });

    it('should return self.position', () => {
      expect(capabilities.self.position).toBe(true);
    });

    it('should return self.meta', () => {
      expect(capabilities.self.meta).toBe(true);
    });

    it('should return self.remove', () => {
      expect(capabilities.self.remove).toBe(true);
    });

    it('should return self.audioFlags', () => {
      expect(capabilities.self.audioFlags).toBe(true);
    });
  });

  describe('member capability getters', () => {
    beforeEach(() => {
      capabilities.updateFromRaw(['member']);
    });

    it('should return member.muteAudio', () => {
      expect(capabilities.member.muteAudio.on).toBe(true);
      expect(capabilities.member.muteAudio.off).toBe(true);
    });

    it('should return member.muteVideo', () => {
      expect(capabilities.member.muteVideo.on).toBe(true);
      expect(capabilities.member.muteVideo.off).toBe(true);
    });

    it('should return member.deaf', () => {
      expect(capabilities.member.deaf.on).toBe(true);
      expect(capabilities.member.deaf.off).toBe(true);
    });

    it('should return member.raisehand', () => {
      expect(capabilities.member.raisehand.on).toBe(true);
      expect(capabilities.member.raisehand.off).toBe(true);
    });

    it('should return member.microphoneVolume', () => {
      expect(capabilities.member.microphoneVolume).toBe(true);
    });

    it('should return member.microphoneSensitivity', () => {
      expect(capabilities.member.microphoneSensitivity).toBe(true);
    });

    it('should return member.speakerVolume', () => {
      expect(capabilities.member.speakerVolume).toBe(true);
    });

    it('should return member.position', () => {
      expect(capabilities.member.position).toBe(true);
    });

    it('should return member.meta', () => {
      expect(capabilities.member.meta).toBe(true);
    });

    it('should return member.remove', () => {
      expect(capabilities.member.remove).toBe(true);
    });

    it('should return member.audioFlags', () => {
      expect(capabilities.member.audioFlags).toBe(true);
    });
  });

  describe('observable emissions', () => {
    it('should emit on end$ when capability changes', () => {
      const values: boolean[] = [];
      const subscription = capabilities.end$.subscribe((value) => values.push(value));

      capabilities.updateFromRaw(['end']);
      capabilities.updateFromRaw([]);
      capabilities.updateFromRaw(['end']);

      expect(values).toEqual([false, true, false, true]);
      subscription.unsubscribe();
    });

    it('should emit on self$ when self capability changes', () => {
      const values: boolean[] = [];
      const subscription = capabilities.self$
        .pipe(map((self) => self.muteAudio.on))
        .subscribe((value) => values.push(value));

      capabilities.updateFromRaw(['self.mute.audio.on']);
      capabilities.updateFromRaw(['self.mute.audio']);

      expect(values).toEqual([false, true, true]);
      subscription.unsubscribe();
    });

    it('should use distinctUntilChanged to avoid duplicate emissions', () => {
      const values: boolean[] = [];
      const subscription = capabilities.end$.subscribe((value) => values.push(value));

      // Same capabilities, should not emit duplicate
      capabilities.updateFromRaw(['end', 'device']);
      capabilities.updateFromRaw(['end', 'screenshare']); // Different but end is still true

      // end should still be true, only 1 emission after initial
      expect(values).toEqual([false, true]);
      subscription.unsubscribe();
    });
  });

  describe('destroy', () => {
    it('should complete all observables on destroy', () => {
      let completed = false;
      capabilities.state$.subscribe({
        complete: () => {
          completed = true;
        }
      });

      capabilities.destroy();
      expect(completed).toBe(true);
    });

    it('should complete end$ on destroy', () => {
      let completed = false;
      capabilities.end$.subscribe({
        complete: () => {
          completed = true;
        }
      });

      capabilities.destroy();
      expect(completed).toBe(true);
    });
  });
});
