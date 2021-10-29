import { UserOptions, getLogger, AssertSameType } from '@signalwire/core'
import { createClient } from './createClient'
import { MakeRoomOptions } from './Client'
import { BaseRoomSession } from './BaseRoomSession'

/**
 * @internal
 * @deprecated Use {@link RoomSession} instead.
 **/
export interface Room extends BaseRoomSession<Room> {}

interface CreateRoomObjectOptionsMain
  extends UserOptions,
    Omit<MakeRoomOptions, 'rootElement'> {
  /** Id of the HTML element in which to display the video stream */
  rootElementId?: string
  /** Whether to automatically join the room session. */
  autoJoin?: boolean
}

/**
 * @deprecated Usage of this object is deprecated. See {@link RoomSession}
 * instead.
 */
export interface CreateRoomObjectOptions
  extends AssertSameType<
    CreateRoomObjectOptionsMain,
    {
      /** SignalWire project id, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
      project?: string
      /** SignalWire project token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9` */
      token: string
      /** logging level */
      logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
      /** Id of the HTML element in which to display the video stream */
      rootElementId?: string
      /** Whether to apply the local-overlay on top of your video. Default: `true`. */
      applyLocalVideoOverlay?: boolean
      /** Whether to stop the camera when the member is muted. Default: `true`. */
      stopCameraWhileMuted?: boolean
      /** Whether to stop the microphone when the member is muted. Default: `true`. */
      stopMicrophoneWhileMuted?: boolean
      /** List of ICE servers. */
      iceServers?: RTCIceServer[]
      /** Audio constraints to use when joining the room. Default: `true`. */
      audio?: MediaStreamConstraints['audio']
      /** Video constraints to use when joining the room. Default: `true`. */
      video?: MediaStreamConstraints['video']
      /** Id of the speaker device to use for audio output. If undefined, picks a default speaker. */
      speakerId?: string
      /** Whether to automatically join the room session. */
      autoJoin?: boolean
    }
  > {}

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

        getLogger().warn(
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
