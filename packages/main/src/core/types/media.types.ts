/** WebRTC transceiver direction for a single media kind. */
export type MediaDirection = RTCRtpTransceiverDirection;

/** Audio and video directions "inactive" | "recvonly" | "sendonly" | "sendrecv" | "stopped" */
export interface MediaDirections {
  /** Audio direction */
  audio: MediaDirection;
  /** Video direction */
  video: MediaDirection;
}

/** Options controlling which media tracks to send and receive. */
export interface MediaOptions {
  /** Enable audio input. Defaults to `true` when not specified. */
  audio?: boolean;
  /** Enable video input. Defaults to `false` when not specified. */
  video?: boolean;
  /** Custom constraints for the audio input track. */
  inputAudioDeviceConstraints?: MediaTrackConstraints;
  /** Custom constraints for the video input track. */
  inputVideoDeviceConstraints?: MediaTrackConstraints;
  /** Pre-existing audio stream to use instead of `getUserMedia`. */
  inputAudioStream?: MediaStream;
  /** Pre-existing video stream to use instead of `getUserMedia`. */
  inputVideoStream?: MediaStream;
  /** Whether to receive remote audio. */
  receiveAudio?: boolean;
  /** Whether to receive remote video. */
  receiveVideo?: boolean;
  /**
   * When local media can't be acquired (permission denied or device
   * unavailable), continue the call in receive-only mode instead of failing.
   * Defaults to `true`. Ignored when the call is not set to receive any media.
   */
  fallbackToReceiveOnly?: boolean;
}
