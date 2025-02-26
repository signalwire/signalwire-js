import { RoomSessionScreenShare } from '../../RoomSessionScreenShare'
import { LocalVideoOverlay, OverlayMap, UserOverlay } from '../../VideoOverlays'
import { StartScreenShareOptions } from './video'

export interface BaseRoomSessionContract {
  /**
   * A JS Map containing all the layers on top of the Root Element
   */
  overlayMap: OverlayMap | undefined
  /**
   * Local video overlay object that the SDK injects in the DOM element inside the MCU
   */
  localVideoOverlay: LocalVideoOverlay | undefined
  /**
   * List of screen share objects
   */
  screenShareList: RoomSessionScreenShare[]
  /**
   * Leaves the room immediately. This detaches all the locally originating streams from the room.
   */
  leave(): void
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
  /**
   * Replaces the current speaker with a different one.
   *
   * > 📘
   * > Some browsers do not support output device selection. You can check by calling {@link WebRTC.supportsMediaOutput}.
   *
   * @param opts
   * @param opts.deviceId id of the new speaker device
   *
   * @example Replaces the current speaker:
   * ```typescript
   * await room.updateSpeaker({deviceId: "/o4ZeWzroh+8q0Ds/CFfmn9XpqaHzmW3L/5ZBC22CRg="})
   * ```
   */
  updateSpeaker(opts: { deviceId: string }): Promise<undefined>
}
