/** SDP role for the peer connection negotiation. */
export type RTCPeerConnectionType = 'offer' | 'answer';

/** Purpose of the peer connection (primary call, screen share, or additional device). */
export type RTCPeerConnectionPropose = 'main' | 'screenshare' | 'additional-device';

/** States during call connection establishment. */
export type CallConnectStates = 'connecting' | 'connected';

/** Lifecycle states of the signaling protocol for a call. */
export type SignalingCallStates = 'created' | 'ringing' | 'answered' | 'ending' | 'ended';

/** Whether the call is inbound (received) or outbound (initiated). */
export type CallDirection = 'inbound' | 'outbound';

/** Playback state of media being played into a call. */
export type CallPlayState = 'playing' | 'paused' | 'finished';

/** Common parameters shared by all call device types. */
interface CallDeviceCommonParams {
  /** Optional SIP headers to include in the call setup. */
  headers?: unknown[];
}

/** Parameters for a WebRTC or SIP call device. */
export interface CallDeviceWebRTCOrSIPParams extends CallDeviceCommonParams {
  /** Source address or URI for the call. */
  from: string;
  /** Destination address or URI for the call. */
  to: string;
}

/** Parameters for a phone (PSTN) call device. */
export interface CallDevicePhoneParams extends CallDeviceCommonParams {
  /** Caller phone number (E.164 format). */
  from_number: string;
  /** Destination phone number (E.164 format). */
  to_number: string;
}

/** A WebRTC or SIP call device descriptor. */
export interface CallDeviceWebRTCOrSIP {
  /** Transport type for the device. */
  type: 'webrtc' | 'sip';
  /** Connection parameters for the device. */
  params: CallDeviceWebRTCOrSIPParams;
}

/** A phone (PSTN) call device descriptor. */
export interface CallDevicePhone {
  /** Transport type for the device. */
  type: 'phone';
  /** Connection parameters for the device. */
  params: CallDevicePhoneParams;
}

/** Discriminated union of call device types (WebRTC, SIP, or phone). */
export type CallDevice = CallDeviceWebRTCOrSIP | CallDevicePhone;

/**
 * Feature capability string that controls what actions a participant can perform.
 *
 * Capabilities are organized into categories:
 * - **self.\*** — Actions the local participant can perform on themselves (mute, deaf, volume, position, meta).
 * - **member.\*** — Actions that can be performed on other participants.
 * - **layout.\*** — Layout management for the video canvas.
 * - **digit.\*** — DTMF digit sending.
 * - **vmuted.\*** — Visibility control for muted video participants.
 * - **lock.\*** — Room lock/unlock control.
 * - **device** / **screenshare** — Device and screen share capabilities.
 * - **end** — Permission to end the call or room.
 */
export type Capability =
  // Self
  | 'self'
  | 'self.mute'
  | 'self.mute.audio'
  | 'self.mute.audio.on'
  | 'self.mute.audio.off'
  | 'self.mute.video'
  | 'self.mute.video.on'
  | 'self.mute.video.off'
  | 'self.deaf'
  | 'self.deaf.on'
  | 'self.deaf.off'
  | 'self.microphone'
  | 'self.microphone.volume.set'
  | 'self.microphone.sensitivity.set'
  | 'self.speaker'
  | 'self.speaker.volume.set'
  | 'self.position.set'
  | 'self.meta'
  | 'self.audioflags.set'

  // Member
  | 'member'
  | 'member.mute'
  | 'member.mute.audio'
  | 'member.mute.audio.on'
  | 'member.mute.audio.off'
  | 'member.mute.video'
  | 'member.mute.video.on'
  | 'member.mute.video.off'
  | 'member.deaf'
  | 'member.deaf.on'
  | 'member.deaf.off'
  | 'member.microphone'
  | 'member.microphone.volume.set'
  | 'member.microphone.sensitivity.set'
  | 'member.speaker'
  | 'member.speaker.volume.set'
  | 'member.position.set'
  | 'member.meta'
  | 'member.audioflags.set'

  // Layout
  | 'layout'
  | 'layout.set'

  // Digit
  | 'digit'
  | 'digit.send'

  // Vmuted
  | 'vmuted'
  | 'vmuted.hide'
  | 'vmuted.hide.on'
  | 'vmuted.hide.off'

  // Lock
  | 'lock'
  | 'lock.on'
  | 'lock.off'

  // Device & Screenshare
  | 'device'
  | 'screenshare'

  // End
  | 'end';

/**
 * Position of a participant's video within the layout canvas.
 *
 * - `'auto'` — Automatically positioned by the layout engine.
 * - `` `reserved-${number}` `` — A reserved slot in the layout (e.g., `'reserved-0'`).
 * - `` `standard-${number}` `` — A standard slot in the layout (e.g., `'standard-1'`).
 * - `'off-canvas'` — Participant is not visible in the layout.
 * - `'playback'` — Playback position for media streams.
 * - `'full-screen'` — Participant occupies the entire canvas.
 */
export type VideoPosition =
  | 'auto'
  | `reserved-${number}`
  | `standard-${number}`
  | 'off-canvas'
  | 'playback'
  | 'full-screen';
