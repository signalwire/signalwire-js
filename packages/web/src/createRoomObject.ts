import { logger, UserOptions } from '@signalwire/core'
import { createClient } from './createClient'
import { videoElementFactory } from './utils/videoElementFactory'

export interface CreateRoomObjectOptions extends UserOptions {
  audio: MediaStreamConstraints['audio']
  video: MediaStreamConstraints['video']
  iceServers?: RTCIceServer[]
  rootElementId?: string
  applyLocalVideoOverlay?: boolean
  autoJoin?: boolean
}

/**
 * ## Intro
 * Using Video.createRoomObject you can create an RTCSession to join a room.
 *
 * ## Examples
 * Create the rtcSession object using the JWT.
 *
 * @example
 * With an HTMLDivElement with id="root" in the DOM.
 * ```js
 * // <div id="root"></div>
 *
 * try {
 *   const rtcSession = await VideoSDK.createRTCSession({
 *     token: '<YourJWT>',
 *     rootElementId: 'root',
 *   })
 *
 *   rtcSession.join()
 * } catch (error) {
 *   console.error('Error', error)
 * }
 * ```
 */
export const createRoomObject = (roomOptions: CreateRoomObjectOptions) => {
  return new Promise(async (resolve, reject) => {
    const {
      audio = true,
      video = true,
      iceServers,
      rootElementId,
      applyLocalVideoOverlay = true,
      autoJoin = false,
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

    const room = client.rooms.makeCall({
      destinationNumber: 'room',
      callerName: '',
      callerNumber: '',
      audio,
      video,
      negotiateAudio: true,
      negotiateVideo: true,
      iceServers,
    })

    if (rootElementId) {
      const {
        rtcTrackHandler,
        destroyHandler,
        layoutChangedHandler,
        showOverlay,
        hideOverlay,
      } = videoElementFactory({ rootElementId, applyLocalVideoOverlay })
      room.on('layout.changed', (params: any) => {
        layoutChangedHandler({
          layout: params.layout,
          // @ts-ignore
          localVideoTrack: room.localVideoTrack,
          // @ts-ignore
          myMemberId: room.memberId,
        })
      })
      room.on('member.updated.video_muted', (params: any) => {
        try {
          const { member } = params
          // @ts-ignore
          if (member.id === room.memberId && 'video_muted' in member) {
            member.video_muted ? hideOverlay(member.id) : showOverlay(member.id)
          }
        } catch (error) {
          logger.warn('Member updated error', error)
        }
      })
      room.on('track', rtcTrackHandler)
      room.once('destroy', destroyHandler)
    }

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
