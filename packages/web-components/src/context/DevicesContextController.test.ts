import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { DevicesContextController } from './DevicesContextController.js';
import type { Call, DeviceController } from '../types/index.js';

@customElement('test-devices-host')
class TestHost extends LitElement {
  controller = new DevicesContextController(this);
}

function createMockDeviceController() {
  return {
    audioInputDevices$: new BehaviorSubject<MediaDeviceInfo[]>([]),
    audioOutputDevices$: new BehaviorSubject<MediaDeviceInfo[]>([]),
    videoInputDevices$: new BehaviorSubject<MediaDeviceInfo[]>([]),
    selectedAudioInputDevice$: new BehaviorSubject<MediaDeviceInfo | null>(null),
    selectedAudioOutputDevice$: new BehaviorSubject<MediaDeviceInfo | null>(null),
    selectedVideoInputDevice$: new BehaviorSubject<MediaDeviceInfo | null>(null),
    selectAudioInputDevice: vi.fn(),
    selectAudioOutputDevice: vi.fn(),
    selectVideoInputDevice: vi.fn(),
    enableDeviceMonitoring: vi.fn(),
  };
}

function makeSelf() {
  return {
    audioMuted$: new BehaviorSubject(false),
    videoMuted$: new BehaviorSubject(false),
    deaf$: new BehaviorSubject(false),
    echoCancellation$: new BehaviorSubject(true),
    autoGain$: new BehaviorSubject(true),
    noiseSuppression$: new BehaviorSubject(true),
    toggleMute: vi.fn().mockResolvedValue(undefined),
    toggleMuteVideo: vi.fn().mockResolvedValue(undefined),
    toggleDeaf: vi.fn().mockResolvedValue(undefined),
    toggleEchoCancellation: vi.fn().mockResolvedValue(undefined),
    toggleAudioInputAutoGain: vi.fn().mockResolvedValue(undefined),
    toggleNoiseSuppression: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockCall() {
  return {
    self$: new BehaviorSubject<ReturnType<typeof makeSelf> | null>(null),
  };
}

function fakeDevice(deviceId: string, label: string, kind: MediaDeviceKind): MediaDeviceInfo {
  return {
    deviceId, label, kind, groupId: 'g',
    toJSON: () => ({}),
  } as MediaDeviceInfo;
}

function getState(host: TestHost) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (host.controller as any)._state;
}

describe('DevicesContextController', () => {
  let host: TestHost;

  beforeEach(async () => {
    host = document.createElement('test-devices-host') as TestHost;
    document.body.appendChild(host);
    await host.updateComplete;
  });

  describe('connectDevices', () => {
    it('publishes device lists from the DeviceController', () => {
      const dc = createMockDeviceController();
      host.controller.connectDevices(dc as unknown as DeviceController);
      const mic = fakeDevice('mic-1', 'Built-in Mic', 'audioinput');
      dc.audioInputDevices$.next([mic]);
      expect(getState(host).audioInputDevices).toEqual([mic]);
    });

    it('reflects selected devices', () => {
      const dc = createMockDeviceController();
      host.controller.connectDevices(dc as unknown as DeviceController);
      const cam = fakeDevice('cam-1', 'FaceTime', 'videoinput');
      dc.selectedVideoInputDevice$.next(cam);
      expect(getState(host).selectedVideoInput).toBe(cam);
    });

    it('forwards selectAudioInput/Output/VideoInput to the DeviceController', () => {
      const dc = createMockDeviceController();
      host.controller.connectDevices(dc as unknown as DeviceController);
      const s = getState(host);
      const mic = fakeDevice('mic-1', 'Mic', 'audioinput');
      s.selectAudioInput(mic);
      s.selectAudioOutput(mic);
      s.selectVideoInput(mic);
      expect(dc.selectAudioInputDevice).toHaveBeenCalledWith(mic);
      expect(dc.selectAudioOutputDevice).toHaveBeenCalledWith(mic);
      expect(dc.selectVideoInputDevice).toHaveBeenCalledWith(mic);
    });

    it('enables device monitoring on connect and on refresh', () => {
      const dc = createMockDeviceController();
      host.controller.connectDevices(dc as unknown as DeviceController);
      expect(dc.enableDeviceMonitoring).toHaveBeenCalledTimes(1);
      host.controller.refreshDevices();
      expect(dc.enableDeviceMonitoring).toHaveBeenCalledTimes(2);
    });
  });

  describe('connectCall', () => {
    it('audioMuted/videoMuted/speakerMuted reflect the current self', () => {
      const call = createMockCall();
      host.controller.connectCall(call as unknown as Call);
      const self = makeSelf();
      call.self$.next(self);
      self.audioMuted$.next(true);
      self.videoMuted$.next(true);
      self.deaf$.next(true);
      const s = getState(host);
      expect(s.audioMuted).toBe(true);
      expect(s.videoMuted).toBe(true);
      expect(s.speakerMuted).toBe(true);
    });

    it('switches to a new self when self$ emits a new instance', () => {
      const call = createMockCall();
      host.controller.connectCall(call as unknown as Call);
      const selfA = makeSelf();
      call.self$.next(selfA);
      selfA.audioMuted$.next(true);
      expect(getState(host).audioMuted).toBe(true);

      const selfB = makeSelf();
      call.self$.next(selfB);
      // selfB defaults are false → state should reflect that
      expect(getState(host).audioMuted).toBe(false);

      // Old self emissions are ignored
      selfA.audioMuted$.next(true);
      expect(getState(host).audioMuted).toBe(false);
    });

    it('falls back to false / true defaults when self is null', () => {
      const call = createMockCall();
      host.controller.connectCall(call as unknown as Call);
      const s = getState(host);
      expect(s.audioMuted).toBe(false);
      expect(s.echoCancellation).toBe(true);
      expect(s.autoGain).toBe(true);
      expect(s.noiseSuppression).toBe(true);
    });

    it('toggle actions call through to the live self', async () => {
      const call = createMockCall();
      host.controller.connectCall(call as unknown as Call);
      const self = makeSelf();
      call.self$.next(self);
      const s = getState(host);
      await s.toggleAudioMute();
      await s.toggleVideoMute();
      await s.toggleSpeakerMute();
      await s.toggleEchoCancellation();
      await s.toggleAutoGain();
      await s.toggleNoiseSuppression();
      expect(self.toggleMute).toHaveBeenCalled();
      expect(self.toggleMuteVideo).toHaveBeenCalled();
      expect(self.toggleDeaf).toHaveBeenCalled();
      expect(self.toggleEchoCancellation).toHaveBeenCalled();
      expect(self.toggleAudioInputAutoGain).toHaveBeenCalled();
      expect(self.toggleNoiseSuppression).toHaveBeenCalled();
    });

    it('toggle actions are no-ops when self is null', async () => {
      const call = createMockCall();
      host.controller.connectCall(call as unknown as Call);
      // self$ never emits a non-null self
      const s = getState(host);
      await expect(s.toggleAudioMute()).resolves.toBeUndefined();
      await expect(s.toggleVideoMute()).resolves.toBeUndefined();
    });

    it('disconnectCall resets call-driven state and stops further updates', () => {
      const call = createMockCall();
      host.controller.connectCall(call as unknown as Call);
      const self = makeSelf();
      call.self$.next(self);
      self.audioMuted$.next(true);
      expect(getState(host).audioMuted).toBe(true);

      host.controller.disconnectCall();
      expect(getState(host).audioMuted).toBe(false);

      // Late emissions ignored
      self.audioMuted$.next(true);
      expect(getState(host).audioMuted).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('tears down both device and call subscriptions', () => {
      const dc = createMockDeviceController();
      const call = createMockCall();
      host.controller.connectDevices(dc as unknown as DeviceController);
      host.controller.connectCall(call as unknown as Call);

      host.controller.disconnect();

      // Late emissions on either side are ignored.
      const mic = fakeDevice('mic-1', 'Mic', 'audioinput');
      dc.audioInputDevices$.next([mic]);
      expect(getState(host).audioInputDevices).toEqual([]);
    });

    it('hostDisconnected calls disconnect()', () => {
      const dc = createMockDeviceController();
      host.controller.connectDevices(dc as unknown as DeviceController);
      host.remove();
      const mic = fakeDevice('mic-1', 'Mic', 'audioinput');
      dc.audioInputDevices$.next([mic]);
      expect(getState(host).audioInputDevices).toEqual([]);
    });
  });
});
