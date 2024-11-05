import { VideoLayoutChangedEventParams, VideoPosition } from '@signalwire/core'
import {
  OverlayMap,
  LocalVideoOverlay,
  UserOverlay,
} from '../../fabric/VideoOverlays'

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
   * A JS Map containing all the layers on top of the Root Element
   */
  overlayMap: OverlayMap | undefined
  /**
   * Local video overlay object that injects the DOM element inside the MCU
   */
  localVideoOverlay: LocalVideoOverlay | undefined
  /**
   * Return the member overlay on top of the root element
   */
  getMemberOverlay: (memberId: string) => UserOverlay
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
}
