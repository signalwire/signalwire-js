import 'regenerator-runtime/runtime.js'
import {
  JWTSession,
  SignalWire,
  configureStore,
  connect,
  UserOptions,
  getEventEmitter,
  BaseComponent,
} from '@signalwire/core'
import { Call } from '@signalwire/webrtc'

export { JWTSession }

export class Client extends SignalWire {
  get rooms() {
    return {
      // TODO: use CallOptions interface here
      makeCall: (options: any) => {
        return connect({
          store: this.store,
          Component: Call,
          onStateChangeListeners: {
            state: 'onStateChange',
            remoteSDP: 'onRemoteSDP',
            roomId: 'onRoomId',
            errors: 'onError',
            responses: 'onSuccess',
          },
        })({
          ...options,
          emitter: this.options.emitter,
        })
      },
    }
  }
}

export const createSession = (userOptions: UserOptions): Promise<Client> => {
  return new Promise((resolve, _reject) => {
    const baseUserOptions: UserOptions = {
      ...userOptions,
      emitter: getEventEmitter(userOptions),
    }
    const store = configureStore({
      userOptions: baseUserOptions,
      SessionConstructor: JWTSession,
    })
    const client = new Client(baseUserOptions, store)
    if (baseUserOptions.autoConnect) {
      const unsubscribe = store.subscribe(() => {
        const state = store.getState()

        if (state.session.protocol) {
          resolve(client)
          unsubscribe()
        }
      })

      client.connect()
    } else {
      resolve(client)
    }
  })
}

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

    const client = await createSession({
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
