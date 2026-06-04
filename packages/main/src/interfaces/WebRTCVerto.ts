import type { VertoManager } from './VertoManager';
import type { LocalAudioPipeline } from '../controllers/LocalAudioPipeline';
import type { RTCPeerConnectionController } from '../controllers/RTCPeerConnectionController';
import type { MediaDirections } from '../core/types/media.types';
import type { SignalingStatus, TransferOptions } from '../managers/types/verto-manager.types';
import type { Observable } from 'rxjs';

/**
 * Extended interface for WebRTC Verto Manager
 * Includes WebRTC-specific state and peer connection management
 */
export interface WebRTCVerto extends VertoManager {
  readonly selfId$: Observable<string | null>;
  readonly selfId: string | null;
  readonly nodeId$: Observable<string | null>;
  readonly nodeId: string | null;
  readonly localStream$: Observable<MediaStream>;
  readonly localStream: MediaStream | null;
  readonly remoteStream$: Observable<MediaStream>;
  readonly remoteStream: MediaStream | null;
  readonly mediaDirections$: Observable<MediaDirections>;
  readonly mediaDirections: MediaDirections;
  readonly signalingStatus$: Observable<SignalingStatus>;
  readonly mainPeerConnection: RTCPeerConnectionController;
  bye(cause?: string): Promise<void>;
  sendDigits(dtmf: string): Promise<void>;
  hold(): Promise<void>;
  unhold(): Promise<void>;
  destroy(): void;
  transfer(options: TransferOptions): Promise<void>;
  /** Request a video keyframe via verto.modify. */
  requestKeyframe?: () => void;
  /** Request an ICE restart via verto.modify with iceRestart offer. */
  requestIceRestart?: (relayOnly?: boolean) => Promise<void>;
  /** Request an ICE restart on all active peer connections (multi-leg). */
  requestIceRestartAll?: (relayOnly?: boolean) => Promise<void>;
  /** Request keyframes on all video-receiving legs (skips send-only screen share). */
  requestKeyframeAll?: () => void;
  /** Lazily create (or return) the local audio pipeline for the main peer connection. */
  ensureLocalAudioPipeline(): LocalAudioPipeline | null;
  /** Current local audio pipeline, or null if it has not been created yet. */
  readonly localAudioPipeline: LocalAudioPipeline | null;
}
