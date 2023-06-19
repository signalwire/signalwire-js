import {
  UserOptions,
  getLogger,
  VideoAuthorization,
  VideoRoomSubscribedEventParams,
} from '@signalwire/core'
import { createClient } from './createClient'
import { BaseRoomSession } from './BaseRoomSession'
import { checkMediaParams, getJoinMediaParams } from './utils/roomSession'
import type { MakeRoomOptions } from './Client'
import type {
  BaseRoomSessionJoinParams,
  RoomSessionObjectEvents,
} from './utils/interfaces'
import { getStorage, CALL_ID } from './utils/storage'

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
  'getMeta',
  'setMeta',
  'updateMeta',
  'deleteMeta',
  'getMemberMeta',
  'setMemberMeta',
  'updateMemberMeta',
  'deleteMemberMeta',
  'promote',
  'demote',
]

/**
 * List of events that the SDK must subscribe at the invite time.
 * ie. ScreenShare/AdditionaDevice are based on the member.joined logic.
 */
const REQUIRED_EVENTS: (keyof RoomSessionObjectEvents)[] = [
  'member.joined',
  'layout.changed',
]
const noop = () => {}

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
 * roomSession.join({ receiveAudio: true, sendVideo: false })
 * ```
 */
export const RoomSession = function (roomOptions: RoomSessionOptions) {
  const {
    audio: audioFromConstructor = true,
    video: videoFromConstructor = true,
    iceServers,
    rootElement,
    applyLocalVideoOverlay = true,
    mirrorLocalVideoOverlay = false,
    stopCameraWhileMuted = true,
    stopMicrophoneWhileMuted = true,
    speakerId,
    destinationNumber,
    localStream,
    ...userOptions
  } = roomOptions

  const deprecatedParams = ['audio', 'video']
  deprecatedParams.forEach((param) => {
    if (param in roomOptions) {
      getLogger().warn(
        `The '${param}' parameter on the RoomSession constructor is deprecated. Set it on the '.join()' function instead.`
      )
    }
  })

  const client = createClient<RoomSession>(userOptions)
  const room = client.rooms.makeRoomObject({
    // audio,
    // video: video === true ? VIDEO_CONSTRAINTS : video,
    negotiateAudio: true,
    negotiateVideo: true,
    iceServers,
    rootElement,
    applyLocalVideoOverlay,
    mirrorLocalVideoOverlay,
    stopCameraWhileMuted,
    stopMicrophoneWhileMuted,
    speakerId,
    destinationNumber,
    localStream,
  })

  // @ts-expect-error - true by default
  const allowReattach = roomOptions?.reattach !== false

  const reattachManager = {
    joined: ({ call_id }: VideoRoomSubscribedEventParams) => {
      if (allowReattach) {
        getStorage()?.setItem(CALL_ID, call_id)
      }
    },
    init: () => {
      if (!allowReattach) {
        return
      }
      room.on('room.subscribed', reattachManager.joined)

      const prevCallId = getStorage()?.getItem(CALL_ID)
      if (prevCallId) {
        room.options.prevCallId = prevCallId
      }
    },
    destroy: () => {
      if (!allowReattach) {
        return
      }

      room.off('room.subscribed', reattachManager.joined)
      getStorage()?.removeItem(CALL_ID)
    },
  }

  // WebRTC connection left the room.
  room.once('destroy', () => {
    // @ts-expect-error
    room.emit('room.left', { reason: room.leaveReason })

    // Remove callId to reattach
    reattachManager.destroy()
    client.disconnect()
  })

  client.once('session.disconnected', () => {
    room.destroy()
  })

  const join = (params?: BaseRoomSessionJoinParams) => {
    return new Promise(async (resolve, reject) => {
      try {
        // @ts-expect-error
        room.attachPreConnectWorkers()

        await client.connect()

        // Fallback to the constructor values for backwards compat.
        const audio = params?.audio ?? audioFromConstructor
        const video = params?.video ?? videoFromConstructor

        // @ts-expect-error
        const authState: VideoAuthorization = client._sessionAuthState
        const mediaOptions = getJoinMediaParams({
          authState,
          // constructor values override the send
          sendAudio: Boolean(audio),
          sendVideo: Boolean(video),
          ...params,
        })

        if (!checkMediaParams(mediaOptions)) {
          client.disconnect()
          return reject(
            new Error(
              `Invalid arguments to join the room. The token used has join_as: '${
                authState.join_as
              }'. \n${JSON.stringify(params, null, 2)}\n`
            )
          )
        }
        getLogger().debug('Set mediaOptions', mediaOptions)

        /**
         * audio and video might be objects with MediaStreamConstraints
         * so if we must send media, we make sure to use the user's
         * preferences.
         * Note: params.sendAudio: `true` will override audio: `false` so
         * we're using `||` instead of `??` for that reason.
         */
        // @ts-expect-error
        room.updateMediaOptions({
          audio: mediaOptions.mustSendAudio ? audio || true : false,
          video: mediaOptions.mustSendVideo ? video || true : false,
          negotiateAudio: mediaOptions.mustRecvAudio,
          negotiateVideo: mediaOptions.mustRecvVideo,
        })

        room.once('room.subscribed', (payload) => {
          // @ts-expect-error
          room.attachOnSubscribedWorkers(payload)
          resolve(room)
        })

        // Hijack previous callId if present
        reattachManager.init()

        REQUIRED_EVENTS.forEach((event) => room.once(event, noop))

        await room.join()
      } catch (error) {
        getLogger().error('RoomSession Join', error)
        // Disconnect the underlay client in case of media/signaling errors
        client.disconnect()

        reject(error)
      }
    })
  }

  const interceptors = {
    join,
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
