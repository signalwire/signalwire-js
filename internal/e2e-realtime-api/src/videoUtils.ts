import { mediaDevices, RTCPeerConnection, MediaStream } from 'wrtc'
import { CloseEvent } from '@signalwire/core'
import { Video } from '@signalwire/js'
import { WebSocket } from 'ws'
import { request } from 'node:https'
import { getAuthorization } from './utils'

// @ts-expect-error
mediaDevices.enumerateDevices = () => {
  return Promise.resolve([])
}

const PERMISSIONS = [
  'room.self.audio_mute',
  'room.self.audio_unmute',
  'room.self.video_mute',
  'room.self.video_unmute',
  'room.self.deaf',
  'room.self.undeaf',
  'room.self.set_input_volume',
  'room.self.set_output_volume',
  'room.self.set_input_sensitivity',
  'room.list_available_layouts',
  'room.set_layout',
  'room.member.video_mute',
  'room.member.audio_mute',
  'room.member.remove',
  'room.recording',
  'room.playback',
  'room.playback_seek',
]
type CreateVRTParams = {
  roomName: string
  userName: string
}
const createVRT = (params: CreateVRTParams): Promise<{ token: string }> => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      room_name: params.roomName,
      user_name: params.userName,
      auto_create_room: true,
      permissions: PERMISSIONS,
    })
    const options = {
      host: process.env.API_HOST,
      port: 443,
      method: 'POST',
      path: '/api/video/room_tokens',
      headers: {
        Authorization: getAuthorization(),
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    }
    // console.log('CRT options', options)
    const req = request(options, (response) => {
      let body = ''
      response.on('data', (chunk) => {
        body += chunk
      })

      response.on('end', () => {
        resolve(JSON.parse(body))
      })
    })

    req.on('error', reject)

    req.write(data)
    req.end()
  })
}

type CreateRoomSessionParams = CreateVRTParams & {}
export const createRoomSession = (
  params: CreateRoomSessionParams
): Promise<Video.RoomSession> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { token } = await createVRT(params)

      global.MediaStream = MediaStream
      // @ts-expect-error
      global.Audio = function () {
        console.log('using audio')
      }
      global.CloseEvent = CloseEvent
      global.WebSocket = WebSocket
      // @ts-expect-error
      global.navigator = {
        mediaDevices,
      }
      // @ts-expect-error
      global.window = {
        RTCPeerConnection,
      }

      const roomSession = new Video.RoomSession({
        host: process.env.RELAY_HOST || 'relay.signalwire.com',
        token: token,
        audio: true,
        video: true,
        // logLevel: 'error',
        // debug: {
        //   logWsTraffic: true,
        // },
      })

      // @ts-expect-error
      roomSession._mungeSDP = (sdp: string) => {
        console.log('SDP', sdp)
        const newLine = '\r\n'
        return (
          sdp
            .split(newLine)
            .filter((line) => {
              if (line.startsWith('a=candidate')) {
                return !line.includes('127.0.0.1')
              }
              return true
            })
            .join(newLine) + newLine
        )
      }

      roomSession.join().then((roomSession) => {
        // console.log('CreateRoomSession OK', roomSession)
        resolve(roomSession)
      })
    } catch (error) {
      console.error('CreateRoomSession Error', error)
      reject(error)
    }
  })
}
