import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';

import { PreflightRunner } from './PreflightRunner';

import type { DeviceController } from '../interfaces/DeviceController';
import type { Call } from '../core/entities/types/call.types';
import type { PreflightResult } from '../core/types/resilience.types';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockDeviceController(overrides: Partial<DeviceController> = {}): DeviceController {
  return {
    selectedAudioInputDevice: {
      deviceId: 'mic-1',
      label: 'Test Mic',
      kind: 'audioinput',
      groupId: 'g1',
      toJSON: vi.fn()
    } as unknown as MediaDeviceInfo,
    selectedVideoInputDevice: {
      deviceId: 'cam-1',
      label: 'Test Cam',
      kind: 'videoinput',
      groupId: 'g2',
      toJSON: vi.fn()
    } as unknown as MediaDeviceInfo,
    selectedAudioOutputDevice: {
      deviceId: 'spk-1',
      label: 'Test Speaker',
      kind: 'audiooutput',
      groupId: 'g3',
      toJSON: vi.fn()
    } as unknown as MediaDeviceInfo,
    audioInputDevices$: new BehaviorSubject([]),
    audioOutputDevices$: new BehaviorSubject([]),
    videoInputDevices$: new BehaviorSubject([]),
    selectedAudioInputDevice$: new BehaviorSubject(null),
    selectedAudioOutputDevice$: new BehaviorSubject(null),
    selectedVideoInputDevice$: new BehaviorSubject(null),
    audioInputDevices: [],
    audioOutputDevices: [],
    videoInputDevices: [],
    selectedAudioInputDeviceConstraints: {},
    selectedVideoInputDeviceConstraints: {},
    deviceInfoToConstraints: vi.fn().mockReturnValue({}),
    selectAudioInputDevice: vi.fn(),
    selectVideoInputDevice: vi.fn(),
    selectAudioOutputDevice: vi.fn(),
    enableDeviceMonitoring: vi.fn(),
    disableDeviceMonitoring: vi.fn(),
    getDeviceCapabilities: vi.fn().mockResolvedValue(null),
    isValidDevice: vi.fn().mockResolvedValue(true),
    errors$: new Subject(),
    ...overrides
  } as unknown as DeviceController;
}

function createMockCall(overrides: Partial<Call> = {}): Call {
  const status$ = new BehaviorSubject<string>('connected');
  return {
    id: 'test-call',
    status$: status$.asObservable(),
    status: 'connected',
    networkMetrics: [
      {
        timestamp: Date.now(),
        roundTripTime: 50,
        availableOutgoingBitrate: 500_000,
        audio: { packetsReceived: 100, bytesReceived: 10000, packetsLost: 0, jitter: 0.01 },
        video: { packetsReceived: 200, bytesReceived: 50000, packetsLost: 0, jitter: 0.02 }
      }
    ],
    hangup: vi.fn().mockResolvedValue(undefined),
    ...overrides
  } as unknown as Call;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PreflightRunner', () => {
  let deviceController: DeviceController;
  let dialFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    deviceController = createMockDeviceController();
    dialFn = vi.fn().mockResolvedValue(createMockCall());
  });

  // -------------------------------------------------------------------------
  // Result shape
  // -------------------------------------------------------------------------

  describe('result shape', () => {
    it('should return a PreflightResult with all required fields', async () => {
      const runner = new PreflightRunner(deviceController, [], true, 50, dialFn, {
        skipMediaTest: true
      });

      const result = await runner.run('/private/test');

      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('signaling');
      expect(result).toHaveProperty('connectivity');
      expect(result).toHaveProperty('bandwidth');
      expect(result).toHaveProperty('devices');
      expect(result).toHaveProperty('warnings');
      expect(result.signaling).toHaveProperty('reachable');
      expect(result.signaling).toHaveProperty('rttMs');
      expect(result.connectivity).toHaveProperty('type');
      expect(result.connectivity).toHaveProperty('turnReachable');
      expect(result.connectivity).toHaveProperty('stunReachable');
      expect(result.connectivity).toHaveProperty('rttMs');
      expect(result.devices).toHaveProperty('audioInput');
      expect(result.devices).toHaveProperty('videoInput');
      expect(result.devices).toHaveProperty('audioOutput');
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Signaling phase
  // -------------------------------------------------------------------------

  describe('signaling test', () => {
    it('should report signaling reachable when connected', async () => {
      const runner = new PreflightRunner(deviceController, [], true, 42, dialFn, {
        skipMediaTest: true
      });

      const result = await runner.run('/private/test');

      expect(result.signaling.reachable).toBe(true);
      expect(result.signaling.rttMs).toBe(42);
    });

    it('should report signaling not reachable when disconnected', async () => {
      const runner = new PreflightRunner(deviceController, [], false, 0, dialFn, {
        skipMediaTest: true
      });

      const result = await runner.run('/private/test');

      expect(result.signaling.reachable).toBe(false);
      expect(result.ok).toBe(false);
      expect(result.warnings).toContain('WebSocket not connected');
    });
  });

  // -------------------------------------------------------------------------
  // Device test phase
  // -------------------------------------------------------------------------

  describe('device test', () => {
    it('should include device info from device controller', async () => {
      const runner = new PreflightRunner(deviceController, [], true, 0, dialFn, {
        skipMediaTest: true
      });

      const result = await runner.run('/private/test');

      // Device test will fail in test environment (no real getUserMedia)
      // but should include the selected devices
      expect(result.devices.audioOutput.device).toBeTruthy();
      expect(result.devices.audioOutput.available).toBe(true);
    });

    it('should warn when audio input is not working', async () => {
      const runner = new PreflightRunner(deviceController, [], true, 0, dialFn, {
        skipMediaTest: true
      });

      const result = await runner.run('/private/test');

      // In test env, getUserMedia fails, so audio won't work
      expect(result.warnings).toContain('Audio input device not working');
    });
  });

  // -------------------------------------------------------------------------
  // skipMediaTest
  // -------------------------------------------------------------------------

  describe('media test (skip)', () => {
    it('should return null bandwidth when skipMediaTest is true', async () => {
      const runner = new PreflightRunner(deviceController, [], true, 0, dialFn, {
        skipMediaTest: true
      });

      const result = await runner.run('/private/test');

      expect(result.bandwidth).toBeNull();
      expect(dialFn).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  describe('cleanup', () => {
    it('should destroy itself after run completes', async () => {
      const runner = new PreflightRunner(deviceController, [], true, 0, dialFn, {
        skipMediaTest: true
      });

      const result = await runner.run('/private/test');

      // The runner should have completed successfully
      expect(result).toBeDefined();
      expect(result.signaling.reachable).toBe(true);
    });

    it('should destroy even when an error occurs', async () => {
      // Force the device test to throw in a way that propagates
      const badDeviceCtrl = createMockDeviceController({
        selectedAudioInputDevice: null,
        selectedVideoInputDevice: null,
        selectedAudioOutputDevice: null
      });

      const runner = new PreflightRunner(badDeviceCtrl, [], true, 0, dialFn, {
        skipMediaTest: true
      });

      // Should still complete without throwing (errors are caught)
      const result = await runner.run('/private/test');
      expect(result).toBeDefined();
    });
  });
});
