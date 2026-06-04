import { describe, it, expect } from 'vitest';

import { computeCapabilities } from './computeCapabilities';
import { DEFAULT_CALL_CAPABILITIES, DEFAULT_MEMBER_CAPABILITIES, DEFAULT_ON_OFF } from './types';

describe('computeCapabilities', () => {
  describe('empty capabilities', () => {
    it('should return default state for empty array', () => {
      const result = computeCapabilities([]);
      expect(result).toEqual(DEFAULT_CALL_CAPABILITIES);
    });
  });

  describe('call-level capabilities', () => {
    it('should detect end capability', () => {
      const result = computeCapabilities(['end']);
      expect(result.end).toBe(true);
    });

    it('should detect device capability', () => {
      const result = computeCapabilities(['device']);
      expect(result.device).toBe(true);
    });

    it('should detect screenshare capability', () => {
      const result = computeCapabilities(['screenshare']);
      expect(result.screenshare).toBe(true);
    });

    it('should detect layout capability', () => {
      const result = computeCapabilities(['layout']);
      expect(result.setLayout).toBe(true);
    });

    it('should detect layout.set capability', () => {
      const result = computeCapabilities(['layout.set']);
      expect(result.setLayout).toBe(true);
    });

    it('should detect digit capability', () => {
      const result = computeCapabilities(['digit']);
      expect(result.sendDigit).toBe(true);
    });

    it('should detect digit.send capability', () => {
      const result = computeCapabilities(['digit.send']);
      expect(result.sendDigit).toBe(true);
    });
  });

  describe('vmuted hide capability', () => {
    it('should return default for no vmuted capability', () => {
      const result = computeCapabilities(['end']);
      expect(result.vmutedHide).toEqual(DEFAULT_ON_OFF);
    });

    it('should grant both on and off for vmuted', () => {
      const result = computeCapabilities(['vmuted']);
      expect(result.vmutedHide.on).toBe(true);
      expect(result.vmutedHide.off).toBe(true);
    });

    it('should grant both on and off for vmuted.hide', () => {
      const result = computeCapabilities(['vmuted.hide']);
      expect(result.vmutedHide.on).toBe(true);
      expect(result.vmutedHide.off).toBe(true);
    });

    it('should grant only on for vmuted.hide.on', () => {
      const result = computeCapabilities(['vmuted.hide.on']);
      expect(result.vmutedHide.on).toBe(true);
      expect(result.vmutedHide.off).toBe(false);
    });

    it('should grant only off for vmuted.hide.off', () => {
      const result = computeCapabilities(['vmuted.hide.off']);
      expect(result.vmutedHide.on).toBe(false);
      expect(result.vmutedHide.off).toBe(true);
    });
  });

  describe('lock capability', () => {
    it('should return default for no lock capability', () => {
      const result = computeCapabilities(['end']);
      expect(result.lock).toEqual(DEFAULT_ON_OFF);
    });

    it('should grant both on and off for lock', () => {
      const result = computeCapabilities(['lock']);
      expect(result.lock.on).toBe(true);
      expect(result.lock.off).toBe(true);
    });

    it('should grant only on for lock.on', () => {
      const result = computeCapabilities(['lock.on']);
      expect(result.lock.on).toBe(true);
      expect(result.lock.off).toBe(false);
    });

    it('should grant only off for lock.off', () => {
      const result = computeCapabilities(['lock.off']);
      expect(result.lock.on).toBe(false);
      expect(result.lock.off).toBe(true);
    });
  });

  describe('self member capabilities', () => {
    it('should return default for no self capability', () => {
      const result = computeCapabilities(['member']);
      expect(result.self).toEqual(DEFAULT_MEMBER_CAPABILITIES);
    });

    it('should grant all capabilities for "self" only', () => {
      const result = computeCapabilities(['self']);

      // All on/off capabilities should grant both on and off
      expect(result.self.muteAudio.on).toBe(true);
      expect(result.self.muteAudio.off).toBe(true);
      expect(result.self.muteVideo.on).toBe(true);
      expect(result.self.muteVideo.off).toBe(true);
      expect(result.self.deaf.on).toBe(true);
      expect(result.self.deaf.off).toBe(true);
      expect(result.self.raisehand.on).toBe(true);
      expect(result.self.raisehand.off).toBe(true);

      // All boolean capabilities should be true
      expect(result.self.microphoneVolume).toBe(true);
      expect(result.self.microphoneSensitivity).toBe(true);
      expect(result.self.speakerVolume).toBe(true);
      expect(result.self.position).toBe(true);
      expect(result.self.meta).toBe(true);
      expect(result.self.remove).toBe(true);
      expect(result.self.audioFlags).toBe(true);
    });

    describe('mute audio', () => {
      it('should grant both on and off for self.mute', () => {
        const result = computeCapabilities(['self.mute']);
        expect(result.self.muteAudio.on).toBe(true);
        expect(result.self.muteAudio.off).toBe(true);
        expect(result.self.muteVideo.on).toBe(true);
        expect(result.self.muteVideo.off).toBe(true);
      });

      it('should grant both on and off for self.mute.audio', () => {
        const result = computeCapabilities(['self.mute.audio']);
        expect(result.self.muteAudio.on).toBe(true);
        expect(result.self.muteAudio.off).toBe(true);
      });

      it('should grant only on for self.mute.audio.on', () => {
        const result = computeCapabilities(['self.mute.audio.on']);
        expect(result.self.muteAudio.on).toBe(true);
        expect(result.self.muteAudio.off).toBe(false);
      });

      it('should grant only off for self.mute.audio.off', () => {
        const result = computeCapabilities(['self.mute.audio.off']);
        expect(result.self.muteAudio.on).toBe(false);
        expect(result.self.muteAudio.off).toBe(true);
      });
    });

    describe('mute video', () => {
      it('should grant both on and off for self.mute.video', () => {
        const result = computeCapabilities(['self.mute.video']);
        expect(result.self.muteVideo.on).toBe(true);
        expect(result.self.muteVideo.off).toBe(true);
      });

      it('should grant only on for self.mute.video.on', () => {
        const result = computeCapabilities(['self.mute.video.on']);
        expect(result.self.muteVideo.on).toBe(true);
        expect(result.self.muteVideo.off).toBe(false);
      });

      it('should grant only off for self.mute.video.off', () => {
        const result = computeCapabilities(['self.mute.video.off']);
        expect(result.self.muteVideo.on).toBe(false);
        expect(result.self.muteVideo.off).toBe(true);
      });
    });

    describe('deaf', () => {
      it('should grant both on and off for self.deaf', () => {
        const result = computeCapabilities(['self.deaf']);
        expect(result.self.deaf.on).toBe(true);
        expect(result.self.deaf.off).toBe(true);
      });

      it('should grant only on for self.deaf.on', () => {
        const result = computeCapabilities(['self.deaf.on']);
        expect(result.self.deaf.on).toBe(true);
        expect(result.self.deaf.off).toBe(false);
      });

      it('should grant only off for self.deaf.off', () => {
        const result = computeCapabilities(['self.deaf.off']);
        expect(result.self.deaf.on).toBe(false);
        expect(result.self.deaf.off).toBe(true);
      });
    });

    describe('microphone capabilities', () => {
      it('should grant both volume and sensitivity for self.microphone', () => {
        const result = computeCapabilities(['self.microphone']);
        expect(result.self.microphoneVolume).toBe(true);
        expect(result.self.microphoneSensitivity).toBe(true);
      });

      it('should grant only volume for self.microphone.volume.set', () => {
        const result = computeCapabilities(['self.microphone.volume.set']);
        expect(result.self.microphoneVolume).toBe(true);
        expect(result.self.microphoneSensitivity).toBe(false);
      });

      it('should grant only sensitivity for self.microphone.sensitivity.set', () => {
        const result = computeCapabilities(['self.microphone.sensitivity.set']);
        expect(result.self.microphoneVolume).toBe(false);
        expect(result.self.microphoneSensitivity).toBe(true);
      });
    });

    describe('speaker capabilities', () => {
      it('should grant speaker volume for self.speaker', () => {
        const result = computeCapabilities(['self.speaker']);
        expect(result.self.speakerVolume).toBe(true);
      });

      it('should grant speaker volume for self.speaker.volume.set', () => {
        const result = computeCapabilities(['self.speaker.volume.set']);
        expect(result.self.speakerVolume).toBe(true);
      });
    });

    describe('other capabilities', () => {
      it('should grant position for self.position.set', () => {
        const result = computeCapabilities(['self.position.set']);
        expect(result.self.position).toBe(true);
      });

      it('should grant meta for self.meta', () => {
        const result = computeCapabilities(['self.meta']);
        expect(result.self.meta).toBe(true);
      });

      it('should grant audioFlags for self.audioflags.set', () => {
        const result = computeCapabilities(['self.audioflags.set']);
        expect(result.self.audioFlags).toBe(true);
      });
    });
  });

  describe('member capabilities', () => {
    it('should return default for no member capability', () => {
      const result = computeCapabilities(['self']);
      expect(result.member).toEqual(DEFAULT_MEMBER_CAPABILITIES);
    });

    it('should grant all capabilities for "member" only', () => {
      const result = computeCapabilities(['member']);

      expect(result.member.muteAudio.on).toBe(true);
      expect(result.member.muteAudio.off).toBe(true);
      expect(result.member.muteVideo.on).toBe(true);
      expect(result.member.muteVideo.off).toBe(true);
      expect(result.member.deaf.on).toBe(true);
      expect(result.member.deaf.off).toBe(true);
      expect(result.member.microphoneVolume).toBe(true);
      expect(result.member.microphoneSensitivity).toBe(true);
      expect(result.member.speakerVolume).toBe(true);
      expect(result.member.position).toBe(true);
      expect(result.member.meta).toBe(true);
      expect(result.member.remove).toBe(true);
      expect(result.member.audioFlags).toBe(true);
    });

    it('should grant mute audio for member.mute.audio', () => {
      const result = computeCapabilities(['member.mute.audio']);
      expect(result.member.muteAudio.on).toBe(true);
      expect(result.member.muteAudio.off).toBe(true);
    });
  });

  describe('real-world capability sets', () => {
    it('should handle typical call.joined capabilities', () => {
      const capabilities = [
        'self',
        'member',
        'vmuted',
        'layout',
        'digit',
        'screenshare',
        'device',
        'lock',
        'end'
      ];

      const result = computeCapabilities(capabilities);

      // Call-level capabilities
      expect(result.end).toBe(true);
      expect(result.device).toBe(true);
      expect(result.screenshare).toBe(true);
      expect(result.setLayout).toBe(true);
      expect(result.sendDigit).toBe(true);
      expect(result.vmutedHide.on).toBe(true);
      expect(result.vmutedHide.off).toBe(true);
      expect(result.lock.on).toBe(true);
      expect(result.lock.off).toBe(true);

      // Self capabilities (all granted)
      expect(result.self.muteAudio.on).toBe(true);
      expect(result.self.muteAudio.off).toBe(true);
      expect(result.self.muteVideo.on).toBe(true);
      expect(result.self.muteVideo.off).toBe(true);

      // Member capabilities (all granted)
      expect(result.member.muteAudio.on).toBe(true);
      expect(result.member.muteAudio.off).toBe(true);
    });

    it('should handle restricted capability set', () => {
      const capabilities = ['self.mute.audio.on', 'self.mute.video.on', 'device'];

      const result = computeCapabilities(capabilities);

      // Limited capabilities
      expect(result.end).toBe(false);
      expect(result.device).toBe(true);
      expect(result.screenshare).toBe(false);

      // Self can only mute (not unmute)
      expect(result.self.muteAudio.on).toBe(true);
      expect(result.self.muteAudio.off).toBe(false);
      expect(result.self.muteVideo.on).toBe(true);
      expect(result.self.muteVideo.off).toBe(false);

      // No member capabilities
      expect(result.member).toEqual(DEFAULT_MEMBER_CAPABILITIES);
    });
  });
});
