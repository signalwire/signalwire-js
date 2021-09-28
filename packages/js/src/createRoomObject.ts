import { UserOptions } from '@signalwire/core'
import { createClient } from './createClient'
import { MakeRoomOptions } from './Client'
import type { Room } from './Room'

export interface CreateRoomObjectOptions extends UserOptions, MakeRoomOptions {
  autoJoin?: boolean
}
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  aspectRatio: { ideal: 16 / 9 },
}

/**
 * ## Intro
 * Using Video.createRoomObject() you can create a `RoomObject` to join a room.
 *
 * ## Examples
 * Create a roomObject using the token.
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
      rootElement,
      applyLocalVideoOverlay = true,
      autoJoin = false,
      stopCameraWhileMuted = true,
      stopMicrophoneWhileMuted = true,
      speakerId,
      ...userOptions
    } = roomOptions

    const client = await createClient({
      ...userOptions,
      autoConnect: true,
    }).catch((error) => {
      reject(error)
      return null
    })

    if (!client) {
      return
    }

    const room = client.rooms.makeRoomObject({
      audio,
      video: video === true ? VIDEO_CONSTRAINTS : video,
      negotiateAudio: true,
      negotiateVideo: true,
      iceServers,
      rootElementId,
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
