import { logger, UserOptions } from '@signalwire/core'
import { RoomObject } from '@signalwire/webrtc'
import { createClient } from './createClient'
import { videoElementFactory } from './utils/videoElementFactory'

export interface CreateRoomObjectOptions extends UserOptions {
  audio: MediaStreamConstraints['audio']
  video: MediaStreamConstraints['video']
  iceServers?: RTCIceServer[]
  rootElementId?: string
  applyLocalVideoOverlay?: boolean
  autoJoin?: boolean
  stopCameraWhileMuted?: boolean
  stopMicrophoneWhileMuted?: boolean
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
): Promise<RoomObject> => {
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
        if (room.localVideoTrack) {
          layoutChangedHandler({
            layout: params.layout,
            localVideoTrack: room.localVideoTrack,
            myMemberId: room.memberId,
          })
        }
      })

      room.on('member.updated.video_muted', (params: any) => {
        try {
          const { member } = params
          if (member.id === room.memberId && 'video_muted' in member) {
            member.video_muted ? hideOverlay(member.id) : showOverlay(member.id)
          }
        } catch (error) {
          logger.error('Error handling video_muted', error)
        }
      })
      room.on('track', rtcTrackHandler)
      room.once('destroy', destroyHandler)
    }

    /**
     * Stop and Restore outbound audio on audio_muted event
     */
    if (stopMicrophoneWhileMuted) {
      room.on('member.updated.audio_muted', ({ member }) => {
        try {
          if (member.id === room.memberId && 'audio_muted' in member) {
            member.audio_muted
              ? room.stopOutboundAudio()
              : room.restoreOutboundAudio()
          }
        } catch (error) {
          logger.error('Error handling audio_muted', error)
        }
      })
    }

    /**
     * Stop and Restore outbound video on video_muted event
     */
    if (stopCameraWhileMuted) {
      room.on('member.updated.video_muted', ({ member }) => {
        try {
          if (member.id === room.memberId && 'video_muted' in member) {
            member.video_muted
              ? room.stopOutboundVideo()
              : room.restoreOutboundVideo()
          }
        } catch (error) {
          logger.error('Error handling video_muted', error)
        }
      })
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
