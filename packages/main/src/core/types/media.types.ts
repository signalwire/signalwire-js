/** WebRTC transceiver direction for a single media kind. */
export type MediaDirection = RTCRtpTransceiverDirection;

/** Audio and video directions "inactive" | "recvonly" | "sendonly" | "sendrecv" | "stopped" */
export interface MediaDirections {
  /** Audio direction */
  audio: MediaDirection;
  /** Video direction */
  video: MediaDirection;
}

/**
 * Where a local track came from. Only a `'device'` capture may be re-acquired:
 * the others carry synthetic `deviceId`s no `getUserMedia` can satisfy, and
 * re-capturing would replace media the SDK does not own.
 */
export type TrackOrigin =
  | 'device'
  /** Supplied via `inputAudioStream` / `inputVideoStream`. */
  | 'application'
  /** `getDisplayMedia` — screen or tab capture. */
  | 'display'
  /** `LocalAudioPipeline` output (a `MediaStreamAudioDestinationNode`). */
  | 'processed';

/** Options for starting a screen share. */
export interface ScreenShareOptions {
  /**
   * Request the shared surface's audio. Defaults to `false`.
   *
   * Whether audio can actually be captured depends on the browser, the OS and
   * the surface the user picks — Chrome offers it for tabs and windows, and a
   * share the user grants without audio yields a video-only stream.
   */
  audio?: boolean;
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
