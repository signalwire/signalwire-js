import { UserOptions, BaseComponent } from '@signalwire/core'
import { createClient } from './createClient'
import { videoElementFactory } from './utils/videoElementFactory'

interface CreateRoomOptions extends UserOptions {
  audio: MediaStreamConstraints['audio']
  video: MediaStreamConstraints['video']
  iceServers?: RTCIceServer[]
  rootElementId?: string
}

export const createRoom = (
  roomOptions: CreateRoomOptions
): Promise<BaseComponent> => {
  return new Promise(async (resolve, _reject) => {
    const {
      audio = true,
      video = true,
      iceServers,
      rootElementId,
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
      experimental: true,
      iceServers,
    })

    if (rootElementId) {
      const { rtcTrackHandler, destroyHandler } = videoElementFactory(
        rootElementId
      )
      room.on('track', rtcTrackHandler)
      room.on('destroy', destroyHandler)
    }

    // WebRTC connection left the room.
    room.on('destroy', () => {
      room.off('track')

      client.disconnect()
    })

    resolve(room)
  })
}
