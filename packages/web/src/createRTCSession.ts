import { logger, UserOptions } from '@signalwire/core'
import { createClient } from './createClient'
import { videoElementFactory } from './utils/videoElementFactory'

interface CreateRTCSessionOptions extends UserOptions {
  audio: MediaStreamConstraints['audio']
  video: MediaStreamConstraints['video']
  iceServers?: RTCIceServer[]
  rootElementId?: string
  applyLocalVideoOverlay?: boolean
}

export const createRTCSession = (roomOptions: CreateRTCSessionOptions) => {
  return new Promise(async (resolve, _reject) => {
    const {
      audio = true,
      video = true,
      iceServers,
      rootElementId,
      applyLocalVideoOverlay = true,
      ...userOptions
    } = roomOptions

    const client = await createClient({
      ...userOptions,
      autoConnect: true,
    })

    const room = client.rooms.makeCall({
      destinationNumber: 'room',
      callerName: '',
      callerNumber: '',
      audio,
      video,
      negotiateAudio: true,
      negotiateVideo: true,
      experimental: true,
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
      room.on('member.updated.audio_muted', (params: any) => {
        console.warn('audio_muted!!', params)
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
      room.on('destroy', destroyHandler)
    }

    // WebRTC connection left the room.
    room.on('destroy', () => {
      client.disconnect()
    })

    resolve(room)
  })
}
