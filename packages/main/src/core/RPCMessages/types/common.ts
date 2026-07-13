// =============================================================================
// SHARED/COMMON INTERFACES
// =============================================================================
// This file contains shared entity types and common interfaces used across
// multiple parts of the SignalWire messaging protocol.

import type { VideoPosition } from '../../types/call.types';

// =============================================================================
// SHARED/COMMON INTERFACES
// =============================================================================

export interface Version {
  major: number;
  minor: number;
  revision: number;
}

export interface IceServer {
  urls: string[];
  credential: string;
  credentialType: string;
  username: string;
}

export interface Authentication {
  jwt_token: string;
}

export interface MemberTarget {
  member_id: string;
  call_id: string;
  node_id: string;
}

export interface Member {
  room_session_id: string;
  room_id: string;
  member_id: string;
  call_id: string;
  name: string;
  // Tolerate unknown member kinds: 'member'/'screen' on direct calls,
  // 'device' on conference, plus any future server-defined kind.
  type: 'member' | 'screen' | 'device' | (string & {});
  parent_id?: string;
  requested_position?: string;
  handraised: boolean;
  visible: boolean;
  audio_muted: boolean;
  video_muted: boolean;
  deaf: boolean;
  input_volume?: number;
  output_volume?: number;
  input_sensitivity?: number;
  echo_cancellation: boolean;
  auto_gain: boolean;
  noise_suppression: boolean;
  lowbitrate: boolean;
  denoise: boolean;
  talking?: boolean;
  isAudience?: boolean;
  meta?: Record<string, unknown>;
  subscriber_id: string;
  address_id: string;
  updated?: string[];
  node_id: string;
}

export interface MemberTalkingInfo {
  member_id: string;
  talking: boolean;
  node_id: string;
}

export interface RoomSession {
  room_session_id: string;
  room_id: string;
  event_channel: string;
  name: string;
  layout_name: string;
  display_name: string;
  recording: boolean;
  streaming: boolean;
  prioritize_handraise: boolean;
  hide_video_muted: boolean;
  locked: boolean;
  meta: Record<string, unknown>;
  members: Member[];
  recordings: Record<string, unknown>[];
  streams: Record<string, unknown>[];
  playbacks: Record<string, unknown>[];
}

export interface LayoutLayer {
  layer_index: number;
  z_index: number;
  member_id?: string;
  playing_file: boolean;
  position: VideoPosition;
  reservation: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layout {
  layers: LayoutLayer[];
  id: string;
  name: string;
}

export interface ConversationDetails {
  status: string;
  start_time: number;
  end_time?: number;
}

export interface DialogParams {
  attach: boolean;
  reattaching: boolean;
  /**
   * Free-form bag of variables echoed back by the server opaquely. The builder
   * only populates `memberCallId`, `memberId`, and any caller-supplied entries.
   */
  userVariables: Record<string, unknown>;
  screenShare: boolean;
  additionalDevice: boolean;
  pingSupported: boolean;
  version: number;
  callID: string;
  destination_number: string;
  remote_caller_id_name: string;
  remote_caller_id_number: string;
  caller_id_name: string;
  caller_id_number: string;
}

export interface PartialDialogParams {
  callID: string;
}

// =============================================================================
// MEDIA PARAMS INTERFACES
// =============================================================================

export interface AudioMediaParams {
  autoGainControl: boolean;
  echoCancellation: boolean;
  noiseSuppression: boolean;
}

export interface FrameRateConstraint {
  min: number;
  ideal: number;
  max: number;
}

export interface AspectRatioConstraint {
  exact: number;
}

export interface DimensionConstraint {
  min: number;
  ideal: number;
}

export interface VideoAdvancedConstraint {
  width: DimensionConstraint;
  height: DimensionConstraint;
  frameRate: FrameRateConstraint;
}

export interface VideoMediaParams {
  frameRate: FrameRateConstraint;
  aspectRatio: AspectRatioConstraint;
  width: DimensionConstraint;
  height: DimensionConstraint;
  advanced: VideoAdvancedConstraint[];
  resizeMode: string;
}

export interface MediaParams {
  audio?: AudioMediaParams;
  video?: VideoMediaParams;
}
