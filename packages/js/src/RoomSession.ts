import {
  UserOptions,
  getLogger,
  Authorization,
} from '@signalwire/core'
import { createClient } from './createClient'
import { BaseRoomSession } from './BaseRoomSession'
import {
  getJoinAudienceMediaParams,
  isValidJoinAudienceMediaParams,
} from './utils/roomSession'
import type { MakeRoomOptions } from './Client'
import type { RoomSessionJoinAudienceParams } from './utils/interfaces'

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, min: 320 },
  height: { ideal: 720, min: 180 },
  aspectRatio: { ideal: 16 / 9 },
}

/**
 * List of properties/methods the user shouldn't be able to
 * use until they sucessfully call `roomSession.join()`.
 */
export const UNSAFE_PROP_ACCESS = [
  'audioMute',
  'audioUnmute',
  'deaf',
  'getLayouts',
  'getMembers',
  'getRecordings',
  'hideVideoMuted',
  'leave',
  'removerMember',
  'restoreOutboundAudio',
  'restoreOutboundVideo',
  'setInputSensitivity',
  'setInputVolume',
  'setLayout',
  'setPositions',
  'setMemberPosition',
  'setOutputVolume',
  'showVideoMuted',
  'startRecording',
  'stopOutboundAudio',
  'stopOutboundVideo',
  'undeaf',
  'videoMute',
  'videoUnmute',
  'setMicrophoneVolume',
  'setSpeakerVolume',
  'setMeta',
  'setMemberMeta',
]

export interface RoomSessionOptions extends UserOptions, MakeRoomOptions {}

export interface RoomSession extends BaseRoomSession<RoomSession> {
  new (opts: RoomSessionOptions): this
}

/**
 * A RoomSession allows you to start and control video sessions.
 *
 * For example, the following code joins a video session and listens for new
 * members joining:
 *
 * ```typescript
 * const roomSession = new SignalWire.Video.RoomSession({
 *   token: '<YourRoomToken>',
 *   rootElement: document.getElementById('myVideoElement'),
 *   audio: true,
 *   video: true,
 * })
 *
 * roomSession.on('member.joined', (e) => {
 *   console.log(`${e.member.name} joined`)
 * })
 *
 * roomSession.join()
 * ```
 */
export const RoomSession = function (roomOptions: RoomSessionOptions) {
  const {
    audio = true,
    video = true,
    iceServers,
    rootElement,
    applyLocalVideoOverlay = true,
    stopCameraWhileMuted = true,
    stopMicrophoneWhileMuted = true,
    speakerId,
    ...userOptions
  } = roomOptions

  const client = createClient<RoomSession>(userOptions)
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

  const join = () => {
    return new Promise(async (resolve, reject) => {
      try {
        // @ts-expect-error
        room.attachPreConnectWorkers()

        await client.connect()

        room.once('room.subscribed', (payload) => {
          // @ts-expect-error
          room.attachOnSubscribedWorkers(payload)
          resolve(room)
        })

        await room.join()
      } catch (error) {
        getLogger().error('RoomSession Join', error)
        // Disconnect the underlay client in case of media/signaling errors
        client.disconnect()

        reject(error)
      }
    })
  }

  const joinAudience = (params?: RoomSessionJoinAudienceParams) => {
    return new Promise(async (resolve, reject) => {
      try {
        // @ts-expect-error
        room.attachPreConnectWorkers()

        const session = await client.connect()

        // @ts-expect-error
        const authState: Authorization = session._sessionAuthState
        const mediaOptions = getJoinAudienceMediaParams({
          authState,
          ...params,
        })

        if (!isValidJoinAudienceMediaParams(mediaOptions)) {
          await session.disconnect()
          return reject(
            new Error(
              '[joinAudience] Either (or both) `audio` and `video` must be `true` when calling this method.'
            )
          )
        }

        // @ts-expect-error
        room.updateMediaOptions(mediaOptions)

        room.once('room.subscribed', (payload) => {
          // @ts-expect-error
          room.attachOnSubscribedWorkers(payload)
          resolve(room)
        })

        await room.join()
      } catch (error) {
        getLogger().error('RoomSession JoinAudience', error)
        // Disconnect the underlay client in case of media/signaling errors
        client.disconnect()

        reject(error)
      }
    })
  }

  const interceptors = {
    join,
    joinAudience,
  } as const

  return new Proxy<Omit<RoomSession, 'new'>>(room, {
    get(target: RoomSession, prop: keyof RoomSession, receiver: any) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      if (!target.active && UNSAFE_PROP_ACCESS.includes(prop)) {
        throw new Error(
          `Tried to access the property/method "${prop}" before the room was connected. Please call roomSession.join() first.`
        )
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (roomOptions: RoomSessionOptions): RoomSession }
