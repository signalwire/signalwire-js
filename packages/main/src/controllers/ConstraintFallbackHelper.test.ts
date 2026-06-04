import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserMediaWithFallback } from './ConstraintFallbackHelper';

import type { WebRTCMediaDevices } from '../dependencies/interfaces';

/**
 * Creates a mock WebRTCMediaDevices with a controllable getUserMedia.
 */
const createMockMediaDevices = (
  getUserMediaImpl: (constraints: MediaStreamConstraints) => Promise<MediaStream>
): WebRTCMediaDevices => ({
  getUserMedia: getUserMediaImpl,
  enumerateDevices: vi.fn().mockResolvedValue([]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
});

const createMockStream = (): MediaStream => ({}) as MediaStream;

const createOverconstrainedError = (): Error => {
  const error = new Error('Could not satisfy constraints');
  error.name = 'OverconstrainedError';
  return error;
};

const createNotAllowedError = (): Error => {
  const error = new Error('Permission denied');
  error.name = 'NotAllowedError';
  return error;
};

describe('getUserMediaWithFallback', () => {
  describe('when no deviceId is provided', () => {
    it('should call getUserMedia directly and return default level', async () => {
      const mockStream = createMockStream();
      const getUserMedia = vi.fn().mockResolvedValue(mockStream);
      const mediaDevices = createMockMediaDevices(getUserMedia);

      const result = await getUserMediaWithFallback(mediaDevices, { audio: true }, 'audio');

      expect(result.stream).toBe(mockStream);
      expect(result.fallbackLevel).toBe('default');
      expect(getUserMedia).toHaveBeenCalledTimes(1);
    });
  });

  describe('exact constraint succeeds (Level 1)', () => {
    it('should return stream with exact fallback level', async () => {
      const mockStream = createMockStream();
      const getUserMedia = vi.fn().mockResolvedValue(mockStream);
      const mediaDevices = createMockMediaDevices(getUserMedia);

      const result = await getUserMediaWithFallback(
        mediaDevices,
        { audio: true },
        'audio',
        'device-123'
      );

      expect(result.stream).toBe(mockStream);
      expect(result.fallbackLevel).toBe('exact');
      expect(getUserMedia).toHaveBeenCalledTimes(1);

      // Verify exact constraint was used
      const calledConstraints = getUserMedia.mock.calls[0][0];
      expect(calledConstraints.audio).toEqual(
        expect.objectContaining({
          deviceId: { exact: 'device-123' }
        })
      );
    });

    it('should preserve base constraints alongside device constraint', async () => {
      const mockStream = createMockStream();
      const getUserMedia = vi.fn().mockResolvedValue(mockStream);
      const mediaDevices = createMockMediaDevices(getUserMedia);

      const result = await getUserMediaWithFallback(
        mediaDevices,
        { audio: { echoCancellation: true, noiseSuppression: false } },
        'audio',
        'device-123'
      );

      expect(result.fallbackLevel).toBe('exact');
      const calledConstraints = getUserMedia.mock.calls[0][0];
      expect(calledConstraints.audio).toEqual({
        echoCancellation: true,
        noiseSuppression: false,
        deviceId: { exact: 'device-123' }
      });
    });
  });

  describe('preferred constraint succeeds (Level 2)', () => {
    it('should fall back to preferred when exact fails with OverconstrainedError', async () => {
      const mockStream = createMockStream();
      const getUserMedia = vi
        .fn()
        .mockRejectedValueOnce(createOverconstrainedError())
        .mockResolvedValueOnce(mockStream);
      const mediaDevices = createMockMediaDevices(getUserMedia);

      const result = await getUserMediaWithFallback(
        mediaDevices,
        { audio: true },
        'audio',
        'device-123'
      );

      expect(result.stream).toBe(mockStream);
      expect(result.fallbackLevel).toBe('preferred');
      expect(getUserMedia).toHaveBeenCalledTimes(2);

      // Verify preferred constraint was used on second call
      const calledConstraints = getUserMedia.mock.calls[1][0];
      expect(calledConstraints.audio).toEqual(
        expect.objectContaining({
          deviceId: 'device-123'
        })
      );
    });
  });

  describe('default constraint succeeds (Level 3)', () => {
    it('should fall back to default when exact and preferred both fail', async () => {
      const mockStream = createMockStream();
      const getUserMedia = vi
        .fn()
        .mockRejectedValueOnce(createOverconstrainedError())
        .mockRejectedValueOnce(createOverconstrainedError())
        .mockResolvedValueOnce(mockStream);
      const mediaDevices = createMockMediaDevices(getUserMedia);

      const result = await getUserMediaWithFallback(
        mediaDevices,
        { audio: true },
        'audio',
        'device-123'
      );

      expect(result.stream).toBe(mockStream);
      expect(result.fallbackLevel).toBe('default');
      expect(getUserMedia).toHaveBeenCalledTimes(3);

      // Verify no deviceId constraint on the third call
      const calledConstraints = getUserMedia.mock.calls[2][0];
      const audioConstraints = calledConstraints.audio as Record<string, unknown>;
      expect(audioConstraints.deviceId).toBeUndefined();
    });
  });

  describe('all levels fail', () => {
    it('should throw when all three levels fail', async () => {
      const getUserMedia = vi
        .fn()
        .mockRejectedValueOnce(createOverconstrainedError())
        .mockRejectedValueOnce(createOverconstrainedError())
        .mockRejectedValueOnce(createOverconstrainedError());
      const mediaDevices = createMockMediaDevices(getUserMedia);

      await expect(
        getUserMediaWithFallback(mediaDevices, { audio: true }, 'audio', 'device-123')
      ).rejects.toThrow();

      expect(getUserMedia).toHaveBeenCalledTimes(3);
    });
  });

  describe('non-OverconstrainedError at Level 1', () => {
    it('should throw immediately without trying further levels', async () => {
      const getUserMedia = vi.fn().mockRejectedValueOnce(createNotAllowedError());
      const mediaDevices = createMockMediaDevices(getUserMedia);

      await expect(
        getUserMediaWithFallback(mediaDevices, { audio: true }, 'audio', 'device-123')
      ).rejects.toThrow('Permission denied');

      // Should not retry -- only 1 call
      expect(getUserMedia).toHaveBeenCalledTimes(1);
    });
  });

  describe('non-OverconstrainedError at Level 2', () => {
    it('should throw immediately after Level 1 OverconstrainedError', async () => {
      const getUserMedia = vi
        .fn()
        .mockRejectedValueOnce(createOverconstrainedError())
        .mockRejectedValueOnce(createNotAllowedError());
      const mediaDevices = createMockMediaDevices(getUserMedia);

      await expect(
        getUserMediaWithFallback(mediaDevices, { audio: true }, 'audio', 'device-123')
      ).rejects.toThrow('Permission denied');

      expect(getUserMedia).toHaveBeenCalledTimes(2);
    });
  });

  describe('video kind', () => {
    it('should apply constraints to the video key', async () => {
      const mockStream = createMockStream();
      const getUserMedia = vi.fn().mockResolvedValue(mockStream);
      const mediaDevices = createMockMediaDevices(getUserMedia);

      const result = await getUserMediaWithFallback(
        mediaDevices,
        { video: { width: { ideal: 1280 } }, audio: false },
        'video',
        'cam-456'
      );

      expect(result.fallbackLevel).toBe('exact');
      const calledConstraints = getUserMedia.mock.calls[0][0];
      expect(calledConstraints.video).toEqual({
        width: { ideal: 1280 },
        deviceId: { exact: 'cam-456' }
      });
      // audio should remain unchanged
      expect(calledConstraints.audio).toBe(false);
    });
  });

  describe('ConstraintNotSatisfiedError (legacy name)', () => {
    it('should treat ConstraintNotSatisfiedError as OverconstrainedError', async () => {
      const legacyError = new Error('Constraint not satisfied');
      legacyError.name = 'ConstraintNotSatisfiedError';

      const mockStream = createMockStream();
      const getUserMedia = vi
        .fn()
        .mockRejectedValueOnce(legacyError)
        .mockResolvedValueOnce(mockStream);
      const mediaDevices = createMockMediaDevices(getUserMedia);

      const result = await getUserMediaWithFallback(
        mediaDevices,
        { audio: true },
        'audio',
        'device-123'
      );

      expect(result.fallbackLevel).toBe('preferred');
    });
  });
});
