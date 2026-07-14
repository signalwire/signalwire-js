// =============================================================================
// VERTO MANAGER TYPES
// =============================================================================
// This file contains types extracted from VertoManager.ts for better organization.

import type { CallStatus } from '../../core/entities/types/call.types';

// =============================================================================
// EXECUTE VERTO OPTIONS
// =============================================================================

export interface ExecuteVertoOptions {
  callID?: string;

  node_id?: string;
  subscribe?: string[];
}

// =============================================================================
// SCREEN SHARE STATUS
// =============================================================================

export type ScreenShareStatus = 'none' | 'starting' | 'started' | 'stopping';

// =============================================================================
// SIGNALING STATUS
// =============================================================================

export type SignalingStatus = Extract<
  CallStatus,
  'trying' | 'ringing' | 'connecting' | 'connected' | 'disconnected' | 'failed'
>;

// =============================================================================
// WEBRTC VERTO MANAGER OPTIONS
// =============================================================================

export interface WebRTCVertoManagerOptions {
  nodeId?: string;
  reattach?: boolean;
  /**
   * Surface a call-level error. `options.fatal` overrides the default
   * fatality classification — auxiliary peer connections (screenshare /
   * additional-device) use it so their failures never destroy the call.
   */
  onError?: (error: Error, options?: { fatal?: boolean }) => void;
  onModifyFailed?: () => void;
}

export interface TransferOptions {
  destination: string;
}
