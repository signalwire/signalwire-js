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

export interface FabricSubscriber {
  version: number;
  expires_at: number;
  subscriber_id: string;
  application_id: string;
  project_id: string;
  space_id: string;
}

export interface AuthorizationInfo {
  jti: string;
  project_id: string;
  data_zone: string;
  fabric_subscriber: FabricSubscriber;
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
  type: 'member' | 'screen';
  parent_id?: string;
  requested_position?: string;
  handraised: boolean;
  visible: boolean;
  audio_muted: boolean;
  video_muted: boolean;
  deaf: boolean;
  input_volume: number;
  output_volume: number;
  input_sensitivity: number;
  echo_cancellation: boolean;
  auto_gain: boolean;
  noise_suppression: boolean;
  lowbitrate: boolean;
  denoise: boolean;
  talking: boolean;
  isAudience: boolean;
  meta: Record<string, unknown>;
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

export interface UserVariables {
  cameraLabel: string;
  company: string;
  country: string;
  displayName: string;
  email: string;
  firstName: string;
  fullBrowserVersion: string;
  gmtOffset: number;
  hostname: string;
  isAndroid: boolean;
  isChrome: boolean;
  isChromium: boolean;
  isEdge: boolean;
  isFirefox: boolean;
  isIE: boolean;
  isIOS: boolean;
  isMobile: boolean;
  isOpera: boolean;
  isSafari: boolean;
  isTablet: boolean;
  isWinPhone: boolean;
  isYandex: boolean;
  lastName: string;
  memberId: string;
  microphoneLabel: string;
  name: string;
  osName: string;
  osVersion: string;
  timezone: string;
  tzString: string;
  userAgent: string;
  memberCallId?: string;
}

export interface DialogParams {
  attach: boolean;
  reattaching: boolean;
  userVariables: UserVariables;
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
