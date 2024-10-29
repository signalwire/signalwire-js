import {
  DisableAudioParams,
  DisableVideoParams,
  EnableAudioParams,
  EnableVideoParams,
} from '@signalwire/webrtc'
import { VideoLayoutChangedEventParams, VideoPosition } from '@signalwire/core'

export interface CallFabricRoomSessionConnectionContract {
  /**
   * The layout returned from the `layout.changed` event based on the current room layout
   */
  currentLayout: VideoLayoutChangedEventParams['layout']
  /**
   * The current position of the member returned from the `layout.changed` event
   */
  currentPosition: VideoPosition
  /**
   * Starts the call via the WebRTC connection
   *
   * @example:
   * ```typescript
   * await call.start()
   * ```
   */
  start(): Promise<void>
  /**
   * Answers the incoming call and starts the WebRTC connection
   *
   * @example:
   * ```typescript
   * await call.answer()
   * ```
   */
  answer(): Promise<void>
  /**
   * Hangs up the current call and disconnects the WebRTC connection.
   * If an RTC Peer ID is passed, the method will only disconnect that Peer, otherwise all Peers will be destroyed
   *
   * @example:
   * ```typescript
   * await call.hangup()
   * ```
   */
  hangup(id?: string): Promise<void>
  /**
   * Upgrades the media in the WebRTC connection to enable audio.
   *
   * @param params - {@link EnableAudioParams}
   *
   * @returns A Promise that resolves once the audio is upgraded in the WebRTC connection.
   */
  enableAudio(params?: EnableAudioParams): Promise<void>
  /**
   * Downgrades the media in the WebRTC connection to disable audio.
   *
   * @param params - {@link DisableAudioParams}
   *
   * @returns A Promise that resolves once the audio is downgraded in the WebRTC connection.
   */
  disableAudio(params?: DisableAudioParams): Promise<void>
  /**
   * Upgrades the media in the WebRTC connection to enable video.
   *
   * @param params - {@link EnableVideoParams}
   *
   * @returns A Promise that resolves once the video is upgraded in the WebRTC connection.
   */
  enableVideo(params?: EnableVideoParams): Promise<void>
  /**
   * Downgrades the media in the WebRTC connection to disable video.
   *
   * @param params - {@link DisableVideoParams}
   *
   * @returns A Promise that resolves once the video is downgraded in the WebRTC connection.
   */
  disableVideo(params?: DisableVideoParams): Promise<void>
}
