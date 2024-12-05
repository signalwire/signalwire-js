import { RoomSessionScreenShare } from '../../RoomSessionScreenShare'
import { LocalVideoOverlay, OverlayMap, UserOverlay } from '../../VideoOverlays'
import { StartScreenShareOptions } from './video'

export interface BaseRoomSessionContract {
  /**
   * A JS Map containing all the layers on top of the Root Element
   */
  overlayMap: OverlayMap | undefined
  /**
   * Local video overlay object that injects the DOM element inside the MCU
   */
  localVideoOverlay: LocalVideoOverlay | undefined
  /**
   * List of screen share objects
   */
  screenShareList: RoomSessionScreenShare[]
  /**
   * Return the member overlay on top of the root element
   */
  getMemberOverlay: (memberId: string) => UserOverlay | undefined
  /**
   * Adds a screen sharing instance to the room. You can create multiple screen
   * sharing instances and add all of them to the room.
   * @param opts - {@link StartScreenShareOptions}
   * @returns - {@link RoomSessionScreenShare}
   *
   * @example Sharing the screen together with the associated audio:
   * ```js
   * await roomSession.startScreenShare({ audio: true, video: true })
   * ```
   */
  startScreenShare(
    opts?: StartScreenShareOptions
  ): Promise<RoomSessionScreenShare>
}
