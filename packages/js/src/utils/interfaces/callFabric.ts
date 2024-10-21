import { VideoLayoutChangedEventParams } from '@signalwire/core'
import { UpdateMediaOptions } from '@signalwire/webrtc'

export interface CallFabricRoomSessionConnectionContract {
  /**
   * The layout returned from the `layout.changed` event based on the current room layout
   */
  currentLayout: VideoLayoutChangedEventParams['layout'] | undefined
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
   * Renegotiate RTC media channels based on the new media constraints
   * 
   * @param renegotiateMediaParams 
   */
  renegotiateMedia(renegotiateMediaParams: UpdateMediaOptions): Promise<void>

  /**
   * Convenience method to enable video in a call
   * 
   * @param enableVideoParam 
   */
  enableVideo(enableVideoParam?: Pick<UpdateMediaOptions, 'video'> & {sendOnly?: boolean}): Promise<void>
  
  /**
   * Convenience method to disable video in a call
   * 
   * @param enableVideoParam 
   */
  disableVideo(disableVideoParam?: {recvOnly?: boolean}): Promise<void>
}
