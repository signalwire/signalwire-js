import { BaseConnectionContract } from '@signalwire/core'
import { BaseConnectionStateEventTypes } from '@signalwire/webrtc'
import { RoomSessionDeviceMethods } from './utils/interfaces'

export interface RoomSessionDeviceDocs
  extends RoomSessionDeviceMethods,
    BaseConnectionContract<BaseConnectionStateEventTypes> {
  /** Joins this device to the room session. */
  join(): Promise<void>

  /** Detaches this device from the room session. */
  leave(): Promise<void>

  /** @ignore */
  readonly previewUrl?: string

  /**
   * Replaces the current camera stream with the one coming from a different
   * device.
   * @param constraints Specify the constraints that the device should satisfy.
   * See
   * [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints).
   *
   * @example Replaces the current camera stream with the one coming from the specified deviceId:
   * ```typescript
   * await roomDevice.updateCamera({deviceId: "/o4ZeWzroh+8q0Ds/CFfmn9XpqaHzmW3L/5ZBC22CRg="})
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
   * await roomDevice.updateMicrophone({deviceId: "/o4ZeWzroh+8q0Ds/CFfmn9XpqaHzmW3L/5ZBC22CRg="})
   * ```
   */
  updateMicrophone(constraints: MediaTrackConstraints): Promise<void>
}
