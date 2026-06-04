import type { MediaOptions } from '../core/types/media.types';
import type { ScreenShareStatus } from '../managers/types/verto-manager.types';
import type { Observable } from 'rxjs';

/**
 * VertoManager interface for WebRTC call management
 * Provides methods for screen sharing, device management, and media constraints
 */
export interface VertoManager {
  // Screen share
  readonly screenShareStatus$: Observable<ScreenShareStatus>;
  readonly screenShareStatus: ScreenShareStatus;
  addScreenMedia(): Promise<void>;
  removeScreenMedia(): Promise<void>;

  // Device management
  addInputDevice(options?: MediaOptions): Promise<string | undefined>;
  removeInputDevices(id: string): Promise<void>;
  addMainInputDevices(options?: MediaOptions): Promise<void>;

  // Media constraints
  updateMediaConstraints(options?: {
    audio?: MediaTrackConstraints;
    video?: MediaTrackConstraints;
  }): Promise<void>;

  // Audio/Video muting
  muteMainAudioInputDevice(): void;
  unmuteMainAudioInputDevice(): Promise<void>;
  muteMainVideoInputDevice(): void;
  unmuteMainVideoInputDevice(): Promise<void>;
}
