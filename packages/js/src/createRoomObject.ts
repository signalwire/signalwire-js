import { UserOptions, logger } from '@signalwire/core'
import { createClient } from './createClient'
import { MakeRoomOptions } from './Client'
import { BaseRoomSession } from './BaseRoomSession'

/**
 * @internal
 * @deprecated Use {@link RoomSession} instead.
 **/
export interface Room extends BaseRoomSession<Room> {}

export interface CreateRoomObjectOptions
  extends UserOptions,
    Omit<MakeRoomOptions, 'rootElement'> {
  rootElementId?: string
  autoJoin?: boolean
}
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  aspectRatio: { ideal: 16 / 9 },
}

/**
 * Using Video.createRoomObject() you can create a `RoomObject` to join a room.
 *
 * @example
 * With an HTMLDivElement with id="root" in the DOM.
 * ```js
 * // <div id="root"></div>
 *
 * try {
 *   const roomObj = await Video.createRoomObject({
 *     token: '<YourJWT>',
 *     rootElementId: 'root',
 *   })
 *
 *   roomObj.join()
 * } catch (error) {
 *   console.error('Error', error)
 * }
 * ```
 * @deprecated Use {@link RoomSession} instead.
 */
export const createRoomObject = (
  roomOptions: CreateRoomObjectOptions
): Promise<Room> => {
  return new Promise(async (resolve, reject) => {
    const {
      audio = true,
      video = true,
      iceServers,
      rootElementId,
      applyLocalVideoOverlay = true,
      autoJoin = false,
      stopCameraWhileMuted = true,
      stopMicrophoneWhileMuted = true,
      speakerId,
      ...userOptions
    } = roomOptions

    const client = createClient<Room>({
      ...userOptions,
    })
    await client.connect()

    if (!client) {
      return
    }

    /**
     * Since `makeRoomObject` now only accepts a
     * `rootElement` the following is to preserve backwards
     * compatibility with the previous syntax
     */
    let rootElement: HTMLElement | undefined
    if (rootElementId) {
      const el = document.getElementById(rootElementId)

      if (el) {
        rootElement = el
      } else {
        rootElement = document.body

        logger.warn(
          `We couldn't find an element with id: ${rootElementId}: using 'document.body' instead.`
        )
      }
    }

    const room = client.rooms.makeRoomObject({
      audio,
      video: video === true ? VIDEO_CONSTRAINTS : video,
      negotiateAudio: true,
      negotiateVideo: true,
      iceServers,
      rootElement,
      applyLocalVideoOverlay,
      stopCameraWhileMuted,
      stopMicrophoneWhileMuted,
      speakerId,
    })

    // WebRTC connection left the room.
    room.once('destroy', () => {
      client.disconnect()
    })

    if (autoJoin) {
      try {
        await room.join()
        resolve(room)
      } catch (error) {
        reject(error)
      }
    } else {
      resolve(room)
    }
  })
}
