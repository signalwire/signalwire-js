import { describe, it, expect } from 'vitest';
import {
  mergeAudioConstraints,
  getDefaultAudioConstraints,
  getDefaultVideoConstraints
} from './AudioConstraintMerger';

import type { ParticipantAudioState } from './AudioConstraintMerger';

describe('AudioConstraintMerger', () => {
  describe('getDefaultAudioConstraints()', () => {
    it('should return default audio processing flags', () => {
      const defaults = getDefaultAudioConstraints();

      expect(defaults).toEqual({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      });
    });

    it('should return a new object each time (immutable)', () => {
      const first = getDefaultAudioConstraints();
      const second = getDefaultAudioConstraints();

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });
  });

  describe('getDefaultVideoConstraints()', () => {
    it('should return default video constraints', () => {
      const defaults = getDefaultVideoConstraints();

      expect(defaults).toEqual({
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: 16 / 9
      });
    });

    it('should return a new object each time (immutable)', () => {
      const first = getDefaultVideoConstraints();
      const second = getDefaultVideoConstraints();

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });
  });

  describe('mergeAudioConstraints()', () => {
    it('should return defaults when all inputs are empty', () => {
      const result = mergeAudioConstraints();

      expect(result).toEqual({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      });
    });

    it('should return defaults when all inputs are explicitly empty objects', () => {
      const result = mergeAudioConstraints({}, {}, {});

      expect(result).toEqual({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      });
    });

    describe('merge priority', () => {
      it('should let user constraints override defaults', () => {
        const userConstraints: MediaTrackConstraints = {
          echoCancellation: false,
          noiseSuppression: false
        };

        const result = mergeAudioConstraints(userConstraints);

        expect(result.echoCancellation).toBe(false);
        expect(result.noiseSuppression).toBe(false);
        // autoGainControl should come from defaults
        expect(result.autoGainControl).toBe(true);
      });

      it('should let participant state override user constraints', () => {
        const userConstraints: MediaTrackConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        };

        const participantState: ParticipantAudioState = {
          echoCancellation: true // server says EC should be on
        };

        const result = mergeAudioConstraints(userConstraints, participantState);

        // Server overrides user for echoCancellation
        expect(result.echoCancellation).toBe(true);
        // User values preserved for noiseSuppression and autoGainControl
        expect(result.noiseSuppression).toBe(false);
        expect(result.autoGainControl).toBe(false);
      });

      it('should let participant state override defaults', () => {
        const participantState: ParticipantAudioState = {
          noiseSuppression: false
        };

        const result = mergeAudioConstraints({}, participantState);

        expect(result.echoCancellation).toBe(true); // from defaults
        expect(result.noiseSuppression).toBe(false); // server override
        expect(result.autoGainControl).toBe(true); // from defaults
      });

      it('should apply all three layers correctly', () => {
        const userConstraints: MediaTrackConstraints = {
          echoCancellation: false,
          noiseSuppression: false
        };

        const participantState: ParticipantAudioState = {
          noiseSuppression: true
        };

        const deviceConstraints: MediaTrackConstraints = {
          deviceId: { exact: 'mic-123' }
        };

        const result = mergeAudioConstraints(userConstraints, participantState, deviceConstraints);

        expect(result).toEqual({
          echoCancellation: false, // from user (overrides default true)
          noiseSuppression: true, // from server (overrides user false)
          autoGainControl: true, // from defaults
          deviceId: { exact: 'mic-123' } // from device constraints
        });
      });
    });

    describe('device constraints', () => {
      it('should include device constraints alongside audio flags', () => {
        const deviceConstraints: MediaTrackConstraints = {
          deviceId: { exact: 'mic-456' }
        };

        const result = mergeAudioConstraints({}, {}, deviceConstraints);

        expect(result.deviceId).toEqual({ exact: 'mic-456' });
        expect(result.echoCancellation).toBe(true);
      });

      it('should include additional device-level constraints', () => {
        const deviceConstraints: MediaTrackConstraints = {
          deviceId: { exact: 'mic-456' },
          sampleRate: { ideal: 48000 },
          channelCount: 2
        };

        const result = mergeAudioConstraints({}, {}, deviceConstraints);

        expect(result.deviceId).toEqual({ exact: 'mic-456' });
        expect(result.sampleRate).toEqual({ ideal: 48000 });
        expect(result.channelCount).toBe(2);
      });
    });

    describe('undefined participant state fields', () => {
      it('should not override when participant state fields are undefined', () => {
        const userConstraints: MediaTrackConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        };

        const participantState: ParticipantAudioState = {
          // All undefined -- should not override anything
        };

        const result = mergeAudioConstraints(userConstraints, participantState);

        expect(result.echoCancellation).toBe(false);
        expect(result.noiseSuppression).toBe(false);
        expect(result.autoGainControl).toBe(false);
      });

      it('should handle partial participant state', () => {
        const participantState: ParticipantAudioState = {
          autoGainControl: false
          // echoCancellation and noiseSuppression undefined
        };

        const result = mergeAudioConstraints({}, participantState);

        expect(result.echoCancellation).toBe(true); // from defaults
        expect(result.noiseSuppression).toBe(true); // from defaults
        expect(result.autoGainControl).toBe(false); // from server
      });
    });

    describe('immutability', () => {
      it('should not mutate any input objects', () => {
        const userConstraints: MediaTrackConstraints = {
          echoCancellation: false
        };
        const participantState: ParticipantAudioState = {
          noiseSuppression: true
        };
        const deviceConstraints: MediaTrackConstraints = {
          deviceId: { exact: 'mic-1' }
        };

        // Save originals
        const userCopy = { ...userConstraints };
        const participantCopy = { ...participantState };
        const deviceCopy = { ...deviceConstraints };

        mergeAudioConstraints(userConstraints, participantState, deviceConstraints);

        expect(userConstraints).toEqual(userCopy);
        expect(participantState).toEqual(participantCopy);
        expect(deviceConstraints).toEqual(deviceCopy);
      });
    });
  });
});
