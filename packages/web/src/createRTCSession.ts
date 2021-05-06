import { UserOptions, BaseComponent } from '@signalwire/core'
import { createClient } from './createClient'
import { videoElementFactory } from './utils/videoElementFactory'

interface CreateRTCSessionOptions extends UserOptions {
  audio: MediaStreamConstraints['audio']
  video: MediaStreamConstraints['video']
  iceServers?: RTCIceServer[]
  rootElementId?: string
  applyLocalVideoOverlay?: boolean
}

export const createRTCSession = (
  roomOptions: CreateRTCSessionOptions
): Promise<BaseComponent> => {
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
        roomJoinedHandler,
      } = videoElementFactory({ rootElementId, applyLocalVideoOverlay })
      room.on('room.joined', (params: any) => {
        // @ts-ignore
        roomJoinedHandler(room.localVideoTrack, params)
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
