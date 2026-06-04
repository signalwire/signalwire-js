import { createContext } from '@lit/context';

// ── Context value shape ───────────────────────────────────────────────────────

export interface DevicesState {
  // ── Device lists ────────────────────────────────────────────────────────
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];

  // ── Selected devices ────────────────────────────────────────────────────
  selectedAudioInput: MediaDeviceInfo | null;
  selectedAudioOutput: MediaDeviceInfo | null;
  selectedVideoInput: MediaDeviceInfo | null;

  // ── Mute state (source of truth: server via call.self$) ─────────────────
  // These reflect what the server says — admin mute will flip these too.
  audioMuted: boolean;
  videoMuted: boolean;
  /** deaf = can't hear = "speaker muted" from the server's perspective */
  speakerMuted: boolean;

  // ── Device actions ───────────────────────────────────────────────────────
  selectAudioInput: (device: MediaDeviceInfo | null) => void;
  selectAudioOutput: (device: MediaDeviceInfo | null) => void;
  selectVideoInput: (device: MediaDeviceInfo | null) => void;

  // ── Mute actions (call through to self participant) ──────────────────────
  toggleAudioMute: () => Promise<void>;
  toggleVideoMute: () => Promise<void>;
  toggleSpeakerMute: () => Promise<void>;

  // ── Audio processing state (source of truth: server via call.self$) ────
  echoCancellation: boolean;
  autoGain: boolean;
  noiseSuppression: boolean;

  // ── Audio processing actions ───────────────────────────────────────────
  toggleEchoCancellation: () => Promise<void>;
  toggleAutoGain: () => Promise<void>;
  toggleNoiseSuppression: () => Promise<void>;
}

export const devicesContext = createContext<DevicesState>('sw-devices');
