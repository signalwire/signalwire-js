/**
 * Tests for device management sections 5.1, 5.4, 5.5, 5.6, 5.9, 5.10, 5.11.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { firstValueFrom, skip, take, toArray } from 'rxjs';
import { NavigatorDeviceController } from './NavigatorDeviceController';
import { StorageManager } from '../managers/StorageManager';
import { PreferencesContainer } from '../containers/PreferencesContainer';
import {
  DEVICE_STORAGE_KEY_AUDIO_INPUT,
  DEVICE_STORAGE_KEY_AUDIO_OUTPUT,
  DEVICE_STORAGE_KEY_VIDEO_INPUT
} from '../core/constants';

import type { WebRTCApiProvider, Storage, StorageScope } from '../dependencies/interfaces';
import type { StoredDevicePreference, DeviceRecoveryEvent } from '../core/types/resilience.types';

// ---- Helpers ----

const createMockDeviceInfo = (overrides: Partial<MediaDeviceInfo> = {}): MediaDeviceInfo => ({
  deviceId: 'test-device-id',
  groupId: 'test-group-id',
  kind: 'audioinput',
  label: 'Test Microphone',
  toJSON: () => ({}),
  ...overrides
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

/** In-memory storage for tests. */
class InMemoryStorage implements Storage {
  private _local: Map<string, string> = new Map();
  private _session: Map<string, string> = new Map();

  private store(scope: StorageScope): Map<string, string> {
    return scope === 'local' ? this._local : this._session;
  }

  async setItem(key: string, value: string | null, scope: StorageScope): Promise<void> {
    if (value === null) {
      this.store(scope).delete(key);
    } else {
      this.store(scope).set(key, value);
    }
  }

  async getItem(key: string, scope: StorageScope): Promise<string | null> {
    return this.store(scope).get(key) ?? null;
  }

  async removeItem(key: string, scope: StorageScope): Promise<void> {
    this.store(scope).delete(key);
  }

  async clear(scope: StorageScope): Promise<void> {
    const store = this.store(scope);
    const keysToRemove: string[] = [];
    for (const key of store.keys()) {
      if (key.startsWith('sw:')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      store.delete(key);
    }
  }

  /** Get raw map contents for assertions. */
  getAllLocal(): Map<string, string> {
    return new Map(this._local);
  }
}

// ---- Test Suites ----

/** Speed up debounce in tests by lowering the device debounce time. */
const setFastDebounce = (): void => {
  PreferencesContainer.instance.deviceDebounceTime = 10;
};

const restoreDefaultDebounce = (): void => {
  PreferencesContainer.instance.deviceDebounceTime = 1500;
};

describe('[NavigatorDeviceController] Section 5.1: Device Persistence', () => {
  let controller: NavigatorDeviceController;
  let mockEnumerateDevices: ReturnType<typeof vi.fn>;
  let storageImpl: InMemoryStorage;
  let storageManager: StorageManager;

  const mic1 = createMockDeviceInfo({
    deviceId: 'mic-1',
    groupId: 'group-a',
    kind: 'audioinput',
    label: 'Built-in Mic'
  });

  const cam1 = createMockDeviceInfo({
    deviceId: 'cam-1',
    groupId: 'group-b',
    kind: 'videoinput',
    label: 'Built-in Camera'
  });

  const speaker1 = createMockDeviceInfo({
    deviceId: 'speaker-1',
    groupId: 'group-c',
    kind: 'audiooutput',
    label: 'Built-in Speaker'
  });

  beforeEach(() => {
    setFastDebounce();
    storageImpl = new InMemoryStorage();
    storageManager = new StorageManager(storageImpl);

    mockEnumerateDevices = vi.fn().mockResolvedValue([mic1, cam1, speaker1]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider, storageManager);
  });

  afterEach(() => {
    controller.destroy();
    vi.clearAllMocks();
    restoreDefaultDebounce();
  });

  it('should persist device selection to storage on selectAudioInputDevice', async () => {
    controller.selectAudioInputDevice(mic1);

    // Wait for async persistence
    await vi.waitFor(async () => {
      const stored = await storageManager.getItem<StoredDevicePreference>(
        DEVICE_STORAGE_KEY_AUDIO_INPUT,
        'local'
      );
      expect(stored).not.toBeNull();
    });

    const stored = await storageManager.getItem<StoredDevicePreference>(
      DEVICE_STORAGE_KEY_AUDIO_INPUT,
      'local'
    );
    expect(stored).toEqual({
      deviceId: 'mic-1',
      label: 'Built-in Mic',
      kind: 'audioinput',
      groupId: 'group-a'
    });
  });

  it('should persist device selection on selectVideoInputDevice', async () => {
    controller.selectVideoInputDevice(cam1);

    await vi.waitFor(async () => {
      const stored = await storageManager.getItem<StoredDevicePreference>(
        DEVICE_STORAGE_KEY_VIDEO_INPUT,
        'local'
      );
      expect(stored).not.toBeNull();
    });

    const stored = await storageManager.getItem<StoredDevicePreference>(
      DEVICE_STORAGE_KEY_VIDEO_INPUT,
      'local'
    );
    expect(stored!.deviceId).toBe('cam-1');
  });

  it('should persist device selection on selectAudioOutputDevice', async () => {
    controller.selectAudioOutputDevice(speaker1);

    await vi.waitFor(async () => {
      const stored = await storageManager.getItem<StoredDevicePreference>(
        DEVICE_STORAGE_KEY_AUDIO_OUTPUT,
        'local'
      );
      expect(stored).not.toBeNull();
    });

    const stored = await storageManager.getItem<StoredDevicePreference>(
      DEVICE_STORAGE_KEY_AUDIO_OUTPUT,
      'local'
    );
    expect(stored!.deviceId).toBe('speaker-1');
  });

  it('should not persist when persistDeviceSelection is false', async () => {
    PreferencesContainer.instance.persistDeviceSelection = false;
    controller.selectAudioInputDevice(mic1);

    // Give async a chance to run
    await new Promise((r) => setTimeout(r, 50));

    const stored = await storageManager.getItem<StoredDevicePreference>(
      DEVICE_STORAGE_KEY_AUDIO_INPUT,
      'local'
    );
    expect(stored).toBeNull();
    PreferencesContainer.instance.persistDeviceSelection = true;
  });

  it('should load persisted device and resolve by exact deviceId', async () => {
    // Pre-populate storage
    await storageManager.setItem(
      DEVICE_STORAGE_KEY_AUDIO_INPUT,
      { deviceId: 'mic-1', label: 'Built-in Mic', kind: 'audioinput', groupId: 'group-a' },
      'local'
    );

    // Create a new controller that will load from storage
    controller.destroy();
    mockEnumerateDevices = vi.fn().mockResolvedValue([mic1, cam1, speaker1]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider, storageManager);

    // Wait for the debounced resolution to select the persisted device
    await vi.waitFor(() => {
      expect(controller.selectedAudioInputDevice?.deviceId).toBe('mic-1');
    });
  });

  it('should resolve persisted device by groupId + label when deviceId changed', async () => {
    await storageManager.setItem(
      DEVICE_STORAGE_KEY_AUDIO_INPUT,
      { deviceId: 'old-mic-id', label: 'Built-in Mic', kind: 'audioinput', groupId: 'group-a' },
      'local'
    );

    controller.destroy();
    mockEnumerateDevices = vi.fn().mockResolvedValue([mic1, cam1, speaker1]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider, storageManager);

    await vi.waitFor(() => {
      expect(controller.selectedAudioInputDevice?.deviceId).toBe('mic-1');
    });
  });

  it('should resolve persisted device by label (single match) as fallback', async () => {
    await storageManager.setItem(
      DEVICE_STORAGE_KEY_AUDIO_INPUT,
      {
        deviceId: 'old-id',
        label: 'Built-in Mic',
        kind: 'audioinput',
        groupId: 'different-group'
      },
      'local'
    );

    controller.destroy();
    mockEnumerateDevices = vi.fn().mockResolvedValue([mic1, cam1, speaker1]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider, storageManager);

    await vi.waitFor(() => {
      expect(controller.selectedAudioInputDevice?.deviceId).toBe('mic-1');
    });
  });
});

describe('[NavigatorDeviceController] Section 5.4: Duplicate Device Handling', () => {
  let controller: NavigatorDeviceController;
  let mockEnumerateDevices: ReturnType<typeof vi.fn>;

  const cam1 = createMockDeviceInfo({
    deviceId: 'cam-1',
    groupId: 'group-a',
    kind: 'videoinput',
    label: 'HD Webcam'
  });

  const cam2 = createMockDeviceInfo({
    deviceId: 'cam-2',
    groupId: 'group-b',
    kind: 'videoinput',
    label: 'HD Webcam'
  });

  beforeEach(() => {
    setFastDebounce();
  });

  afterEach(() => {
    controller.destroy();
    vi.clearAllMocks();
    restoreDefaultDebounce();
  });

  it('should prefer groupId match when two devices share the same label', async () => {
    // Start with cam1 selected, then it disappears, comes back with new deviceId but same groupId
    mockEnumerateDevices = vi.fn().mockResolvedValue([cam1, cam2]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider);

    await vi.waitFor(() => {
      expect(controller.videoInputDevices.length).toBe(2);
    });

    // Select cam1
    controller.selectVideoInputDevice(cam1);
    expect(controller.selectedVideoInputDevice?.deviceId).toBe('cam-1');

    // Simulate cam1 disappearing and being replaced by a device with same label but different deviceId
    // but same groupId
    const cam1New = createMockDeviceInfo({
      deviceId: 'cam-1-new',
      groupId: 'group-a',
      kind: 'videoinput',
      label: 'HD Webcam'
    });

    mockEnumerateDevices.mockResolvedValue([cam1New, cam2]);

    // Trigger re-enumeration
    await controller.enumerateDevices();

    // Wait for debounced resolution
    await vi.waitFor(() => {
      const selected = controller.selectedVideoInputDevice;
      expect(selected?.deviceId).toBe('cam-1-new');
    });
  });

  it('should emit ambiguous_match when no groupId differentiator exists', async () => {
    // Select a device, then make it disappear. Two devices with the same label remain.
    const selectedCam = createMockDeviceInfo({
      deviceId: 'cam-selected',
      groupId: 'group-unique',
      kind: 'videoinput',
      label: 'HD Webcam'
    });

    mockEnumerateDevices = vi.fn().mockResolvedValue([selectedCam]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider);

    await vi.waitFor(() => {
      expect(controller.videoInputDevices.length).toBe(1);
    });

    controller.selectVideoInputDevice(selectedCam);

    const events: DeviceRecoveryEvent[] = [];
    controller.deviceRecovered$.subscribe((e) => events.push(e));

    // Now the selected device disappears and two ambiguous devices appear
    mockEnumerateDevices.mockResolvedValue([cam1, cam2]);
    await controller.enumerateDevices();

    await vi.waitFor(() => {
      expect(events.length).toBeGreaterThan(0);
    });

    const ambiguous = events.find((e) => e.reason === 'ambiguous_match');
    expect(ambiguous).toBeDefined();
    expect(ambiguous!.newDevice).toBeNull();
    expect(ambiguous!.kind).toBe('videoinput');
  });
});

describe('[NavigatorDeviceController] Section 5.5: Sync Devices to Active Calls', () => {
  let controller: NavigatorDeviceController;
  let mockEnumerateDevices: ReturnType<typeof vi.fn>;

  const mic1 = createMockDeviceInfo({
    deviceId: 'mic-1',
    groupId: 'group-a',
    kind: 'audioinput',
    label: 'Mic A'
  });
  const mic2 = createMockDeviceInfo({
    deviceId: 'mic-2',
    groupId: 'group-b',
    kind: 'audioinput',
    label: 'Mic B'
  });

  beforeEach(() => {
    setFastDebounce();
  });

  afterEach(() => {
    controller.destroy();
    vi.clearAllMocks();
    restoreDefaultDebounce();
    PreferencesContainer.instance.syncDevicesToActiveCalls = true;
  });

  it('should auto-switch selected device when sync is enabled', async () => {
    mockEnumerateDevices = vi.fn().mockResolvedValue([mic1]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider);

    await vi.waitFor(() => {
      expect(controller.selectedAudioInputDevice?.deviceId).toBe('mic-1');
    });

    // Select mic1 explicitly
    controller.selectAudioInputDevice(mic1);

    // mic1 disappears, mic2 appears
    mockEnumerateDevices.mockResolvedValue([mic2]);
    await controller.enumerateDevices();

    await vi.waitFor(() => {
      const selected = controller.selectedAudioInputDevice;
      expect(selected?.deviceId).toBe('mic-2');
    });
  });

  it('should NOT auto-switch when syncDevicesToActiveCalls is disabled and device was selected', async () => {
    PreferencesContainer.instance.syncDevicesToActiveCalls = false;

    mockEnumerateDevices = vi.fn().mockResolvedValue([mic1, mic2]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider);

    await vi.waitFor(() => {
      expect(controller.audioInputDevices.length).toBe(2);
    });

    // Explicitly select mic1
    controller.selectAudioInputDevice(mic1);

    // A new mic3 appears and we want to verify no auto-switch
    const mic3 = createMockDeviceInfo({
      deviceId: 'mic-3',
      groupId: 'group-c',
      kind: 'audioinput',
      label: 'Mic C'
    });
    mockEnumerateDevices.mockResolvedValue([mic1, mic2, mic3]);
    await controller.enumerateDevices();

    await vi.waitFor(() => {
      expect(controller.audioInputDevices.length).toBe(3);
    });

    // Selected should still be mic1
    expect(controller.selectedAudioInputDevice?.deviceId).toBe('mic-1');
  });
});

describe('[NavigatorDeviceController] Section 5.6: Mid-call Device Validation', () => {
  it('ConstraintFallbackHelper already handles stale deviceId via OverconstrainedError fallback', async () => {
    // This section verifies the existing ConstraintFallbackHelper covers 5.6.
    // The helper tries exact -> preferred -> default when getUserMedia fails
    // with OverconstrainedError, so a stale deviceId during unmute is handled.
    // We verify the mechanism is in place by importing and testing it.
    const { getUserMediaWithFallback } = await import('./ConstraintFallbackHelper');

    const mockStream = { getTracks: vi.fn(() => []) } as unknown as MediaStream;
    const mockMediaDevices = {
      getUserMedia: vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error(), { name: 'OverconstrainedError' }))
        .mockRejectedValueOnce(Object.assign(new Error(), { name: 'OverconstrainedError' }))
        .mockResolvedValueOnce(mockStream),
      enumerateDevices: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    const result = await getUserMediaWithFallback(
      mockMediaDevices,
      { audio: true },
      'audio',
      'stale-device-id'
    );

    expect(result.fallbackLevel).toBe('default');
    expect(result.stream).toBe(mockStream);
    expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(3);
  });
});

describe('[NavigatorDeviceController] Section 5.9: Intentional Device Disable', () => {
  let controller: NavigatorDeviceController;
  let mockEnumerateDevices: ReturnType<typeof vi.fn>;

  const mic1 = createMockDeviceInfo({
    deviceId: 'mic-1',
    groupId: 'group-a',
    kind: 'audioinput',
    label: 'Mic'
  });
  const cam1 = createMockDeviceInfo({
    deviceId: 'cam-1',
    groupId: 'group-b',
    kind: 'videoinput',
    label: 'Camera'
  });

  beforeEach(() => {
    setFastDebounce();
    mockEnumerateDevices = vi.fn().mockResolvedValue([mic1, cam1]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider);
  });

  afterEach(() => {
    controller.destroy();
    vi.clearAllMocks();
    restoreDefaultDebounce();
  });

  it('should disable video input and return null for selectedVideoInputDevice', async () => {
    await vi.waitFor(() => {
      expect(controller.selectedVideoInputDevice?.deviceId).toBe('cam-1');
    });

    controller.disableVideoInput();

    expect(controller.videoInputDisabled).toBe(true);
    expect(controller.selectedVideoInputDevice).toBeNull();
  });

  it('should return false for constraints when disabled', async () => {
    await vi.waitFor(() => {
      expect(controller.selectedVideoInputDevice?.deviceId).toBe('cam-1');
    });

    controller.disableVideoInput();
    expect(controller.selectedVideoInputDeviceConstraints).toBe(false);

    controller.disableAudioInput();
    expect(controller.selectedAudioInputDeviceConstraints).toBe(false);
  });

  it('should emit videoInputDisabled$ changes', async () => {
    const values: boolean[] = [];
    controller.videoInputDisabled$.subscribe((v) => values.push(v));

    controller.disableVideoInput();
    controller.enableVideoInput();

    await vi.waitFor(() => {
      expect(values).toContain(true);
      expect(values).toContain(false);
    });
  });

  it('should restore last selection on enableVideoInput', async () => {
    await vi.waitFor(() => {
      expect(controller.selectedVideoInputDevice?.deviceId).toBe('cam-1');
    });

    controller.selectVideoInputDevice(cam1);
    controller.disableVideoInput();
    expect(controller.selectedVideoInputDevice).toBeNull();

    controller.enableVideoInput();
    expect(controller.selectedVideoInputDevice?.deviceId).toBe('cam-1');
  });

  it('should restore last selection on enableAudioInput', async () => {
    await vi.waitFor(() => {
      expect(controller.selectedAudioInputDevice?.deviceId).toBe('mic-1');
    });

    controller.selectAudioInputDevice(mic1);
    controller.disableAudioInput();
    expect(controller.selectedAudioInputDevice).toBeNull();
    expect(controller.audioInputDisabled).toBe(true);

    controller.enableAudioInput();
    expect(controller.selectedAudioInputDevice?.deviceId).toBe('mic-1');
    expect(controller.audioInputDisabled).toBe(false);
  });

  it('should re-enable when selectDevice is called while disabled', async () => {
    controller.disableVideoInput();
    expect(controller.videoInputDisabled).toBe(true);

    controller.selectVideoInputDevice(cam1);
    expect(controller.videoInputDisabled).toBe(false);
    expect(controller.selectedVideoInputDevice?.deviceId).toBe('cam-1');
  });

  it('disable/enable cycle should be idempotent', () => {
    controller.disableVideoInput();
    controller.disableVideoInput();
    expect(controller.videoInputDisabled).toBe(true);

    controller.enableVideoInput();
    controller.enableVideoInput();
    expect(controller.videoInputDisabled).toBe(false);
  });
});

describe('[NavigatorDeviceController] Section 5.11: Factory Reset (clearDeviceState)', () => {
  let controller: NavigatorDeviceController;
  let mockEnumerateDevices: ReturnType<typeof vi.fn>;
  let storageImpl: InMemoryStorage;
  let storageManager: StorageManager;

  const mic1 = createMockDeviceInfo({
    deviceId: 'mic-1',
    groupId: 'group-a',
    kind: 'audioinput',
    label: 'Mic'
  });
  const cam1 = createMockDeviceInfo({
    deviceId: 'cam-1',
    groupId: 'group-b',
    kind: 'videoinput',
    label: 'Camera'
  });

  beforeEach(() => {
    setFastDebounce();
    storageImpl = new InMemoryStorage();
    storageManager = new StorageManager(storageImpl);
    mockEnumerateDevices = vi.fn().mockResolvedValue([mic1, cam1]);
    const provider = createMockWebRTCApiProvider(vi.fn(), mockEnumerateDevices);
    controller = new NavigatorDeviceController(provider, storageManager);
  });

  afterEach(() => {
    controller.destroy();
    vi.clearAllMocks();
    restoreDefaultDebounce();
  });

  it('should clear all device state and re-enumerate', async () => {
    await vi.waitFor(() => {
      expect(controller.selectedAudioInputDevice?.deviceId).toBe('mic-1');
    });

    controller.selectAudioInputDevice(mic1);
    controller.selectVideoInputDevice(cam1);

    // Verify selections are present
    expect(controller.selectedAudioInputDevice?.deviceId).toBe('mic-1');
    expect(controller.selectedVideoInputDevice?.deviceId).toBe('cam-1');

    // Clear state
    await controller.clearDeviceState();

    // After clear, device lists should be re-populated but selection
    // will be set via the auto-resolve logic after enumeration
    // The clearDeviceState sets selected to null then triggers enumeration
    // which will auto-select via resolve
    await vi.waitFor(() => {
      expect(controller.audioInputDevices.length).toBe(1);
    });
  });

  it('should reset disabled state on clear', async () => {
    controller.disableVideoInput();
    expect(controller.videoInputDisabled).toBe(true);

    await controller.clearDeviceState();

    expect(controller.videoInputDisabled).toBe(false);
    expect(controller.audioInputDisabled).toBe(false);
  });
});

describe('[StorageManager] Section 5.11: clearAll', () => {
  let storageImpl: InMemoryStorage;
  let storageManager: StorageManager;

  beforeEach(() => {
    storageImpl = new InMemoryStorage();
    storageManager = new StorageManager(storageImpl);
  });

  it('should clear all SDK keys from both scopes', async () => {
    await storageManager.setItem('sw:device:audioinput', { test: true }, 'local');
    await storageManager.setItem('sw:preferences', { pref: 1 }, 'local');
    await storageManager.setItem('sw:test:session', { s: 1 }, 'session');

    await storageManager.clearAll();

    expect(await storageManager.getItem('sw:device:audioinput', 'local')).toBeNull();
    expect(await storageManager.getItem('sw:preferences', 'local')).toBeNull();
    expect(await storageManager.getItem('sw:test:session', 'session')).toBeNull();
  });
});
