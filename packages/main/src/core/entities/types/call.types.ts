// =============================================================================
// CALL TYPES
// =============================================================================
// This file contains types extracted from Call.ts for better organization.

import type { SelectDeviceOptions } from './participant.types';
import type { NetworkIssue, NetworkMetrics } from '../../../controllers/RTCStatsMonitor';
import type {
  TransferOptions,
  ScreenShareStatus
} from '../../../managers/types/verto-manager.types';
import type { CallError } from '../../errors';
import type { JSONRPCRequest, JSONRPCResponse } from '../../RPCMessages/types/base';
import type { LayoutLayer } from '../../RPCMessages/types/common';
import type {
  CallStatePayload,
  CallUpdatedPayload,
  LayoutChangedPayload,
  MemberJoinedPayload,
  MemberLeftPayload,
  MemberTalkingPayload,
  MemberUpdatedPayload
} from '../../RPCMessages/types/events';
import type { Capability, CallDirection, VideoPosition } from '../../types/call.types';
import type { MediaOptions, MediaDirections } from '../../types/media.types';
import type {
  RecoveryEvent,
  RecoveryState,
  QualityLevel,
  MediaParamsEvent
} from '../../types/resilience.types';
import type { PendingRPCOptions } from '../../utils';
import type { Participant, SelfParticipant } from '../Participant';
import type { Observable } from 'rxjs';

// =============================================================================
// PARTICIPANT INTERFACES (minimal interfaces for Call interface)
// =============================================================================

/**
 * Base participant interface for call participants
 * Defines the full public contract for participant objects exposed by Call
 */
export interface CallParticipant {
  readonly id: string;

  // Observable state — emit undefined until server data arrives
  readonly name$: Observable<string | undefined>;
  readonly type$: Observable<string | undefined>;
  readonly handraised$: Observable<boolean | undefined>;
  readonly visible$: Observable<boolean | undefined>;
  readonly audioMuted$: Observable<boolean | undefined>;
  readonly videoMuted$: Observable<boolean | undefined>;
  readonly deaf$: Observable<boolean | undefined>;
  readonly inputVolume$: Observable<number | undefined>;
  readonly outputVolume$: Observable<number | undefined>;
  readonly inputSensitivity$: Observable<number | undefined>;
  readonly echoCancellation$: Observable<boolean | undefined>;
  readonly autoGain$: Observable<boolean | undefined>;
  readonly noiseSuppression$: Observable<boolean | undefined>;
  readonly lowbitrate$: Observable<boolean | undefined>;
  readonly denoise$: Observable<boolean | undefined>;
  readonly meta$: Observable<Record<string, unknown> | undefined>;
  readonly userId$: Observable<string | undefined>;
  readonly addressId$: Observable<string | undefined>;
  readonly nodeId$: Observable<string | undefined>;
  readonly isTalking$: Observable<boolean | undefined>;
  readonly position$: Observable<LayoutLayer | undefined>;

  // Sync getters
  readonly name: string | undefined;
  readonly type: string | undefined;
  readonly handraised: boolean;
  readonly visible: boolean;
  readonly audioMuted: boolean;
  readonly videoMuted: boolean;
  readonly deaf: boolean;
  readonly inputVolume: number | undefined;
  readonly outputVolume: number | undefined;
  readonly inputSensitivity: number | undefined;
  readonly echoCancellation: boolean;
  readonly autoGain: boolean;
  readonly noiseSuppression: boolean;
  readonly lowbitrate: boolean;
  readonly denoise: boolean;
  readonly meta: Record<string, unknown> | undefined;
  readonly userId: string | undefined;
  readonly addressId: string | undefined;
  readonly nodeId: string | undefined;
  readonly callId: string | undefined;
  readonly isTalking: boolean;
  readonly position: LayoutLayer | undefined;
  readonly isAudience: boolean;

  // Control methods
  toggleDeaf(): Promise<void>;
  toggleHandraise(): Promise<void>;
  mute(): Promise<void>;
  unmute(): Promise<void>;
  toggleMute(): Promise<void>;
  muteVideo(): Promise<void>;
  unmuteVideo(): Promise<void>;
  toggleMuteVideo(): Promise<void>;
  toggleEchoCancellation(): Promise<void>;
  toggleAudioInputAutoGain(): Promise<void>;
  toggleNoiseSuppression(): Promise<void>;
  toggleLowbitrate(): Promise<void>;
  setAudioInputSensitivity(value: number): Promise<void>;
  setAudioInputVolume(value: number): Promise<void>;
  setAudioOutputVolume(value: number): Promise<void>;
  setPosition(value: VideoPosition): Promise<void>;
  remove(): Promise<void>;
  end(): Promise<void>;
  setMeta(meta: Record<string, unknown>): Promise<void>;
  updateMeta(meta: Record<string, unknown>): Promise<void>;
}

/**
 * Self participant interface with control methods
 * Extends CallParticipant with methods for controlling the local participant
 */
export interface CallSelfParticipant extends CallParticipant {
  readonly screenShareStatus$: Observable<ScreenShareStatus>;
  readonly screenShareStatus: ScreenShareStatus;

  // Studio audio mode
  readonly studioAudio$: Observable<boolean>;
  readonly studioAudio: boolean;
  enableStudioAudio(): Promise<void>;
  disableStudioAudio(): Promise<void>;

  // Self-only control methods
  startScreenShare(): Promise<void>;
  stopScreenShare(): Promise<void>;
  selectAudioInputDevice(device: MediaDeviceInfo, options?: SelectDeviceOptions): void;
  selectVideoInputDevice(device: MediaDeviceInfo, options?: SelectDeviceOptions): void;
  selectAudioOutputDevice(device: MediaDeviceInfo, options?: SelectDeviceOptions): void;

  // Additional device management
  addAdditionalDevice(options: MediaOptions): Promise<void>;
  removeAdditionalDevice(id: string): Promise<void>;
  addAudioInputDevice(options?: {
    constraints?: MediaTrackConstraints;
    stream?: MediaStream;
  }): Promise<void>;
  addVideoInputDevice(options?: {
    constraints?: MediaTrackConstraints;
    stream?: MediaStream;
  }): Promise<void>;
  addInputDevices(options?: MediaOptions): Promise<void>;

  // Constraint management
  setAudioInputDeviceConstraints(constraints: MediaTrackConstraints): Promise<void>;
  setVideoInputDeviceConstraints(constraints: MediaTrackConstraints): Promise<void>;
  setInputDevicesConstraints(constraints: {
    audio: MediaTrackConstraints;
    video: MediaTrackConstraints;
  }): Promise<void>;
}

// =============================================================================
// ADDRESS INTERFACE (minimal interface for Call interface)
// =============================================================================

/**
 * Minimal interface for a collection with pagination
 */
export interface CallTextMessageCollection {
  readonly values$: Observable<unknown[]>;
  readonly hasMore$: Observable<boolean>;
  loadMore(): void;
}

/**
 * Minimal address interface for call context
 * Avoids circular dependency with full Address class
 */
export interface CallAddress {
  readonly id: string;
  readonly displayName?: string;
  readonly type?: string;
  sendText(text: string): Promise<void>;
  readonly textMessages$: Observable<CallTextMessageCollection | undefined>;
}

// =============================================================================
// CALL STATUS
// =============================================================================

/** Lifecycle status of a call. */
export type CallStatus =
  | 'new'
  | 'trying'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'recovering'
  | 'disconnecting'
  | 'disconnected'
  | 'failed'
  | 'destroyed';

// =============================================================================
// CALL OPTIONS
// =============================================================================

/** Configuration options for creating a call. */
export interface CallOptions extends MediaOptions {
  /**
   * Optional. Hint to the cluster about which node should host this call.
   * Used by reattach to pin to the original node; on fresh dials acts as a
   * steering preference (the server may ignore for placement reasons).
   * Leave undefined for normal load-balanced placement.
   */
  readonly nodeId?: string;
  /** Pre-assigned call ID (used for reattach). */
  readonly callId?: string;
  /** Destination URI. */
  readonly to?: string;
  /** SDP offer for inbound calls. */
  readonly initOffer?: string;
  /** Whether this call is being reattached after reconnect. */
  readonly reattach?: boolean;
  /** Display name of the caller. */
  readonly fromName?: string;
  /** Address URI of the caller. */
  readonly from?: string;
  /** Display name of the callee. */
  readonly toName?: string;
  /** Direction hint for display purposes. */
  readonly displayDirection?: string;
  /** Custom user variables sent with the call invite. */
  readonly userVariables?: Record<string, unknown>;
  /** Preferred video codecs for this call (overrides global preferences). */
  readonly preferredVideoCodecs?: string[];
  /** Preferred audio codecs for this call (overrides global preferences). */
  readonly preferredAudioCodecs?: string[];
  /** Enable stereo Opus for this call (overrides global preferences). */
  readonly stereo?: boolean;
}

// =============================================================================
// CALL STATE INTERFACE
// =============================================================================

/** Observable state of a call (status, recording, participants, etc.). */
export interface CallState {
  readonly id: string;
  readonly status$: Observable<CallStatus>;
  readonly status: CallStatus;
  readonly recording$: Observable<boolean>;
  readonly recording: boolean;
  readonly streaming$: Observable<boolean>;
  readonly streaming: boolean;
  readonly raiseHandPriority$: Observable<boolean>;
  readonly raiseHandPriority: boolean;
  readonly locked$: Observable<boolean>;
  readonly locked: boolean;
  readonly meta$: Observable<Record<string, unknown>>;
  readonly meta: Record<string, unknown>;
  readonly participants$: Observable<CallParticipant[]>;
  readonly participants: CallParticipant[];
  setMeta(meta: Record<string, unknown>): Promise<void>;
  updateMeta(meta: Record<string, unknown>): Promise<void>;
}

// =============================================================================
// CALL INTERFACE
// =============================================================================

/**
 * Public interface for an active WebRTC call.
 *
 * Provides access to media streams, participants, layout, signaling events,
 * and control actions (hangup, mute, transfer, etc.).
 */
export interface Call extends CallState {
  readonly capabilities$: Observable<Capability[]>;
  readonly capabilities: Capability[];
  readonly mediaDirections$: Observable<MediaDirections>;
  readonly mediaDirections: MediaDirections;
  readonly self$: Observable<CallSelfParticipant | null>;
  readonly self: CallSelfParticipant | null;
  readonly to?: string;
  readonly toName?: string;
  readonly from?: string;
  readonly fromName?: string;
  readonly direction: CallDirection;
  readonly layouts$: Observable<string[]>;
  readonly layouts: string[];
  readonly layout$: Observable<string>;
  readonly layout?: string;
  readonly layoutLayers$: Observable<LayoutLayer[]>;
  readonly layoutLayers: LayoutLayer[];
  /** Observable that emits only non-null MediaStreams (waits until the stream exists). */
  readonly localStream$: Observable<MediaStream>;
  /** Sync getter — returns null before the stream is created. */
  readonly localStream: MediaStream | null;
  /** Observable that emits only non-null MediaStreams (waits until the stream exists). */
  readonly remoteStream$: Observable<MediaStream>;
  readonly remoteStream: MediaStream | null;
  readonly rtcPeerConnection: RTCPeerConnection | undefined;
  readonly errors$: Observable<CallError>;
  readonly signalingEvent$: Observable<Record<string, unknown>>;
  readonly address?: CallAddress;
  readonly address$: Observable<CallAddress | undefined>;
  userVariables?: Record<string, unknown>;
  readonly userVariables$: Observable<Record<string, unknown>>;

  // Resilience observables & methods
  readonly networkIssues$: Observable<NetworkIssue[]>;
  readonly networkIssues: NetworkIssue[];
  readonly isNetworkHealthy$: Observable<boolean>;
  readonly isNetworkHealthy: boolean;
  readonly networkMetrics$: Observable<NetworkMetrics[]>;
  readonly networkMetrics: NetworkMetrics[];
  readonly qualityScore$: Observable<number>;
  readonly qualityLevel$: Observable<QualityLevel>;
  readonly recoveryState$: Observable<RecoveryState>;
  readonly recoveryEvent$: Observable<RecoveryEvent>;
  readonly bandwidthConstrained$: Observable<boolean>;
  readonly mediaParamsUpdated$: Observable<MediaParamsEvent>;
  requestKeyframe(): void;
  requestIceRestart(): Promise<void>;

  subscribe(eventType: string): Observable<Record<string, unknown>>;
  hangup(): Promise<void>;
  toggleLock(): Promise<void>;
  toggleHold(): Promise<void>;
  setLayout(layout: string, positions: Record<string, VideoPosition>): Promise<void>;
  startRecording(): Promise<void>;
  startStreaming(): Promise<void>;
  transfer(options: TransferOptions): Promise<void>;
  toggleIncomingVideo(): Promise<void>;
  toggleIncomingAudio(): Promise<void>;
  answer(options?: MediaOptions): void;
  reject(): void;
  sendDigits(digits: string): Promise<void>;
  executeMethod<T extends JSONRPCResponse = JSONRPCResponse>(
    target: string,
    method: string,
    args: Record<string, unknown>
  ): Promise<T>;
  execute<T extends JSONRPCResponse = JSONRPCResponse>(
    request: JSONRPCRequest,
    options?: PendingRPCOptions
  ): Promise<T>;
}

// =============================================================================
// CALL MANAGER INTERFACE
// =============================================================================

/**
 * Extended Call interface with internal management capabilities
 * Provides access to lower-level call operations, event streams, and session management
 */
export interface CallManager extends Call {
  // Session and configuration
  readonly options: CallOptions;

  // Identity observables
  readonly selfId$: Observable<string | null>;
  readonly selfId: string | null;
  readonly nodeId$: Observable<string | null>;
  readonly nodeId: string | null;

  // Inbound call handling
  readonly answered$: Observable<boolean>;
  readonly answerMediaOptions?: MediaOptions;

  // Event streams for call lifecycle
  readonly callUpdated$: Observable<CallUpdatedPayload>;
  readonly memberJoined$: Observable<MemberJoinedPayload>;
  readonly memberLeft$: Observable<MemberLeftPayload>;
  readonly memberUpdated$: Observable<MemberUpdatedPayload>;
  readonly memberTalking$: Observable<MemberTalkingPayload>;
  readonly callStates$: Observable<CallStatePayload>;
  readonly layoutUpdates$: Observable<LayoutChangedPayload>;

  // Raw event streams
  readonly callEvent$: Observable<unknown>;

  // Internal call management
  addCallId(callId: string): void;
  /** @internal */
  createParticipant(memberId: string, selfId?: string | null): Participant | SelfParticipant;
  destroy(): void;
}
