import { UserOptions, BaseComponent } from '@signalwire/core'
import { createClient } from './createClient'

interface CreateRoomOptions extends UserOptions {
  audio: MediaStreamConstraints['audio']
  video: MediaStreamConstraints['video']
  iceServers?: RTCIceServer[]
  videoElementId?: string
}

export const createRoom = (
  roomOptions: CreateRoomOptions
): Promise<BaseComponent> => {
  return new Promise(async (resolve, _reject) => {
    const {
      audio = true,
      video = true,
      iceServers,
      videoElementId,
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

    if (videoElementId) {
      const rtcTrack = (event: RTCTrackEvent) => {
        console.debug('RTCTrackEvent', event)
        const videoEl = document.getElementById(
          videoElementId
        ) as HTMLMediaElement
        if (videoEl) {
          videoEl.srcObject = event.streams[0]
        }
      }
      room.on('track', rtcTrack)
    }

    // WebRTC connection left the room.
    room.on('destroy', () => client.disconnect())

    resolve(room)
  })
}
