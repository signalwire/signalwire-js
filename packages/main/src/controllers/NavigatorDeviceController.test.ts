import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { NavigatorDeviceController } from './NavigatorDeviceController';

import type { WebRTCApiProvider } from '../dependencies/interfaces';

const createMockDeviceInfo = (overrides: Partial<MediaDeviceInfo> = {}): MediaDeviceInfo => ({
  deviceId: 'test-device-id',
  groupId: 'test-group-id',
  kind: 'audioinput',
  label: 'Test Microphone',
  toJSON: () => ({}),
  ...overrides
});

const createMockTrack = (kind: 'audio' | 'video' = 'audio') => ({
  kind,
  stop: vi.fn(),
  getCapabilities: vi.fn(() => ({
    deviceId: 'test-device-id',
    sampleRate: { min: 8000, max: 48000 }
  }))
});

const createMockStream = (tracks: ReturnType<typeof createMockTrack>[] = []) => ({
  getAudioTracks: vi.fn(() => tracks.filter((t) => t.kind === 'audio')),
  getVideoTracks: vi.fn(() => tracks.filter((t) => t.kind === 'video')),
  getTracks: vi.fn(() => [...tracks])
});

const MockRTCPeerConnection = vi.fn() as unknown as typeof RTCPeerConnection;

const createMockWebRTCApiProvider = (
  getUserMedia: ReturnType<typeof vi.fn>,
  enumerateDevices: ReturnType<typeof vi.fn>
): WebRTCApiProvider => ({
  RTCPeerConnection: MockRTCPeerConnection,
  mediaDevices: {
    getUserMedia,
    enumerateDevices,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
});

describe('[NavigatorDeviceController]', () => {
  let controller: NavigatorDeviceController;
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockEnumerateDevices: ReturnType<typeof vi.fn>;
  let mockProvider: WebRTCApiProvider;

  beforeEach(() => {
    mockGetUserMedia = vi.fn();
    mockEnumerateDevices = vi.fn().mockResolvedValue([]);
    mockProvider = createMockWebRTCApiProvider(mockGetUserMedia, mockEnumerateDevices);

    controller = new NavigatorDeviceController(mockProvider);
  });

  afterEach(() => {
    controller.destroy();
    vi.clearAllMocks();
  });

  describe('getDeviceCapabilities', () => {
    it('should return capabilities for an audioinput device', async () => {
      const mockTrack = createMockTrack('audio');
      const mockStream = createMockStream([mockTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const deviceInfo = createMockDeviceInfo({ kind: 'audioinput' });
      const capabilities = await controller.getDeviceCapabilities(deviceInfo);

      expect(capabilities).toEqual({
        deviceId: 'test-device-id',
        sampleRate: { min: 8000, max: 48000 }
      });
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: expect.any(Object),
        video: false
      });
    });

    it('should return capabilities for a videoinput device', async () => {
      const mockTrack = createMockTrack('video');
      mockTrack.getCapabilities.mockReturnValue({
        width: { min: 1, max: 1920 },
        height: { min: 1, max: 1080 }
      });
      const mockStream = createMockStream([mockTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const deviceInfo = createMockDeviceInfo({
        kind: 'videoinput',
        deviceId: 'video-device-id',
        label: 'Test Camera'
      });
      const capabilities = await controller.getDeviceCapabilities(deviceInfo);

      expect(capabilities).toEqual({
        width: { min: 1, max: 1920 },
        height: { min: 1, max: 1080 }
      });
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: false,
        video: expect.any(Object)
      });
    });

    it('should return null for audiooutput devices', async () => {
      const deviceInfo = createMockDeviceInfo({
        kind: 'audiooutput',
        label: 'Test Speaker'
      });

      const capabilities = await controller.getDeviceCapabilities(deviceInfo);

      expect(capabilities).toBeNull();
      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });

    it('should stop all tracks after getting capabilities', async () => {
      const audioTrack = createMockTrack('audio');
      const extraTrack = createMockTrack('audio');
      const mockStream = createMockStream([audioTrack, extraTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const deviceInfo = createMockDeviceInfo({ kind: 'audioinput' });
      await controller.getDeviceCapabilities(deviceInfo);

      expect(audioTrack.stop).toHaveBeenCalled();
      expect(extraTrack.stop).toHaveBeenCalled();
    });

    it('should throw and emit error when getUserMedia fails', async () => {
      const error = new Error('Permission denied');
      mockGetUserMedia.mockRejectedValue(error);

      const errors: Error[] = [];
      controller.errors$.subscribe((e) => errors.push(e));

      const deviceInfo = createMockDeviceInfo({ kind: 'audioinput' });

      await expect(controller.getDeviceCapabilities(deviceInfo)).rejects.toThrow(
        'Permission denied'
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Permission denied');
    });

    it('should use empty constraints when device is not in enumerated list', async () => {
      const mockTrack = createMockTrack('audio');
      const mockStream = createMockStream([mockTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const deviceInfo = createMockDeviceInfo({
        kind: 'audioinput',
        deviceId: 'unknown-device-id'
      });
      await controller.getDeviceCapabilities(deviceInfo);

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {},
        video: false
      });
    });
  });

  describe('isValidDevice', () => {
    it('should return false for null', async () => {
      const result = await controller.isValidDevice(null);
      expect(result).toBe(false);
    });

    it('should return true for a valid audioinput device', async () => {
      const mockTrack = createMockTrack('audio');
      const mockStream = createMockStream([mockTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const deviceInfo = createMockDeviceInfo({ kind: 'audioinput' });
      const result = await controller.isValidDevice(deviceInfo);

      expect(result).toBe(true);
    });

    it('should return true for a valid videoinput device', async () => {
      const mockTrack = createMockTrack('video');
      const mockStream = createMockStream([mockTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const deviceInfo = createMockDeviceInfo({
        kind: 'videoinput',
        label: 'Test Camera'
      });
      const result = await controller.isValidDevice(deviceInfo);

      expect(result).toBe(true);
    });

    it('should return false for audiooutput devices', async () => {
      const deviceInfo = createMockDeviceInfo({
        kind: 'audiooutput',
        label: 'Test Speaker'
      });

      const result = await controller.isValidDevice(deviceInfo);

      expect(result).toBe(false);
      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });

    it('should return false when getUserMedia throws', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Device not found'));

      const deviceInfo = createMockDeviceInfo({ kind: 'audioinput' });
      const result = await controller.isValidDevice(deviceInfo);

      expect(result).toBe(false);
    });

    it('should not leak errors to the caller when device is invalid', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Device not found'));

      const deviceInfo = createMockDeviceInfo({ kind: 'audioinput' });

      await expect(controller.isValidDevice(deviceInfo)).resolves.toBe(false);
    });
  });

  describe('deviceInfoToConstraints', () => {
    it('should return empty constraints for null device', () => {
      const constraints = controller.deviceInfoToConstraints(null);
      expect(constraints).toEqual({});
    });

    it('should return empty constraints for device with empty deviceId', () => {
      const deviceInfo = createMockDeviceInfo({ deviceId: '' });
      const constraints = controller.deviceInfoToConstraints(deviceInfo);
      expect(constraints).toEqual({});
    });

    it('should return empty constraints for device with whitespace-only deviceId', () => {
      const deviceInfo = createMockDeviceInfo({ deviceId: '   ' });
      const constraints = controller.deviceInfoToConstraints(deviceInfo);
      expect(constraints).toEqual({});
    });

    it('should return empty constraints when device is not in enumerated list', () => {
      const deviceInfo = createMockDeviceInfo({
        kind: 'audioinput',
        deviceId: 'unknown-device-id'
      });
      const constraints = controller.deviceInfoToConstraints(deviceInfo);
      expect(constraints).toEqual({});
    });
  });

  describe('selectDevice helpers', () => {
    it('should set and get selected audio input device', () => {
      const device = createMockDeviceInfo({ kind: 'audioinput' });
      controller.selectAudioInputDevice(device);
      expect(controller.selectedAudioInputDevice).toBe(device);
    });

    it('should set and get selected video input device', () => {
      const device = createMockDeviceInfo({ kind: 'videoinput', label: 'Camera' });
      controller.selectVideoInputDevice(device);
      expect(controller.selectedVideoInputDevice).toBe(device);
    });

    it('should set and get selected audio output device', () => {
      const device = createMockDeviceInfo({ kind: 'audiooutput', label: 'Speaker' });
      controller.selectAudioOutputDevice(device);
      expect(controller.selectedAudioOutputDevice).toBe(device);
    });

    it('should allow setting selected device to null', () => {
      const device = createMockDeviceInfo({ kind: 'audioinput' });
      controller.selectAudioInputDevice(device);
      controller.selectAudioInputDevice(null);
      expect(controller.selectedAudioInputDevice).toBeNull();
    });
  });

  describe('observable device lists', () => {
    it('should emit initial empty arrays for device lists', async () => {
      const audioInputs = await firstValueFrom(controller.audioInputDevices$);
      expect(audioInputs).toEqual([]);
    });

    it('should emit initial null for selected devices', async () => {
      const selectedAudio = await firstValueFrom(controller.selectedAudioInputDevice$);
      expect(selectedAudio).toBeNull();
    });
  });

  describe('destroy', () => {
    it('should complete observables when destroyed', () => {
      let completed = false;
      controller.errors$.subscribe({ complete: () => (completed = true) });

      controller.destroy();

      expect(completed).toBe(true);
    });

    it('should remove device change event listener on destroy', () => {
      const removeEventListener = mockProvider.mediaDevices.removeEventListener as ReturnType<
        typeof vi.fn
      >;

      controller.destroy();

      expect(removeEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function));
    });
  });
});
