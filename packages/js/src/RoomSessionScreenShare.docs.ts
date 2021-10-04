import {
  BaseConnectionContract,
} from '@signalwire/core'
import {
  BaseConnectionStateEventTypes,
} from '@signalwire/webrtc'
import { RoomScreenShareMethods } from './utils/interfaces'

export interface RoomSessionScreenShareDocs
  extends RoomScreenShareMethods,
  BaseConnectionContract<BaseConnectionStateEventTypes> {

  /** Whether the connection is currently active */
  get active(): boolean

  /** The id of the video device, or null if not available */
  get cameraId(): string

  /** The label of the video device, or null if not available */
  get cameraLabel(): string

  /**
   * Provides access to the local audio
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  get localAudioTrack(): MediaStreamTrack

  /** Provides access to the local [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream) */
  get localStream(): MediaStream

  /**
   * Provides access to the local video
   * [MediaStreamTrack](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack).
   */
  get localVideoTrack(): MediaStreamTrack

  /** The id of the current member within the room */
  get memberId(): string

  /** The id of the audio input device, or null if not available */
  get microphoneId(): string

  /** The label of the audio input device, or null if not available */
  get microphoneLabel(): string

  /**
   * Provides access to the remote [MediaStream](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
   */
  get remoteStream(): MediaStream

  /** The unique identifier for the room */
  get roomId(): string

  /** The unique identifier for the room session */
  get roomSessionId(): string

  /** Whether the connection is currently in the "trying" state. */
  get trying(): boolean

  /** @internal */
  restoreOutboundAudio: any
  /** @internal */
  restoreOutboundVideo: any
  /** @internal */
  stopOutboundAudio: any
  /** @internal */
  stopOutboundVideo: any

  /** Joins this device to the room session. */
  join(): Promise<void>

  /** Detaches this device from the room session. */
  leave(): Promise<void>

  /**
   * Replaces the current camera stream with the one coming from a different
   * device.
   * @param constraints Specify the constraints that the device should satisfy.
   * See
   * [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
   * 
   * @example Replaces the current camera stream with the one coming from the specified deviceId:
   * ```typescript
   * await room.updateCamera({deviceId: "/o4ZeWzroh+8q0Ds/CFfmn9XpqaHzmW3L/5ZBC22CRg="})
   * ```
   */
  updateCamera(constraints: MediaTrackConstraints): Promise<void>

  /**
   * Replaces the current microphone stream with the one coming from a different
   * device.
   * @param constraints Specify the constraints that the device should satisfy.
   * See
   * [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
   *
   * @example Replaces the current microphone stream with the one coming from
   * the specified deviceId:
   * ```typescript
   * await room.updateMicrophone({deviceId: "/o4ZeWzroh+8q0Ds/CFfmn9XpqaHzmW3L/5ZBC22CRg="})
   * ```
   */
  updateMicrophone(constraints: MediaTrackConstraints): Promise<void>

}