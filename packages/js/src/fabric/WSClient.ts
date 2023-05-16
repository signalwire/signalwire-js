// import { buildCall } from './buildCall'
import { createClient } from '../createClient'
import { WSClientWorker } from './WSClientWorker'
import { getLogger } from '@signalwire/core'

interface WSClientOptions {
  host?: string
  token: string
  rootElement?: HTMLElement
}

export class WSClient {
  private wsClient: ReturnType<typeof createClient>
  private logger = getLogger()

  constructor(public options: WSClientOptions) {
    this.wsClient = createClient({
      host: this.options.host,
      token: this.options.token,
      debug: {
        logWsTraffic: true,
      },
      logLevel: 'debug',
    })
  }

  connect() {
    // @ts-ignore
    this.wsClient.runWorker('WSClientWorker', {
      worker: WSClientWorker,
    })
    return this.wsClient.connect()
  }

  disconnect() {
    return this.wsClient.disconnect()
  }

  async dial(params: { to: string }) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('WSClient dial with:', params)

        await this.connect()

        // const {
        //   audio: audioFromConstructor = true,
        //   video: videoFromConstructor = true,
        //   iceServers,
        //   rootElement,
        //   applyLocalVideoOverlay = true,
        //   stopCameraWhileMuted = true,
        //   stopMicrophoneWhileMuted = true,
        //   speakerId,
        //   destinationNumber,
        //   watchMediaPackets,
        //   watchMediaPacketsTimeout,
        //   ...userOptions
        // } = params

        const call = this.wsClient.rooms.makeRoomObject({
          // audio,
          // video: video === true ? VIDEO_CONSTRAINTS : video,
          negotiateAudio: true,
          negotiateVideo: true,
          // iceServers,
          rootElement: this.options.rootElement,
          applyLocalVideoOverlay: true,
          stopCameraWhileMuted: true,
          stopMicrophoneWhileMuted: true,
          // speakerId,
          destinationNumber: params.to,
          watchMediaPackets: false,
          // watchMediaPacketsTimeout:,
        })

        // WebRTC connection left the room.
        call.once('destroy', () => {
          this.logger.debug('RTC Connection Destroyed')
        })

        this.wsClient.once('session.disconnected', () => {
          this.logger.debug('Session Disconnected')
        })

        // @ts-expect-error
        call.attachPreConnectWorkers()

        call.once('room.subscribed', (payload) => {
          // @ts-expect-error
          call.attachOnSubscribedWorkers(payload)

          resolve(call)
        })

        await call.join()

        // call.updateMediaOptions({
        //   audio,
        //   video,
        //   negotiateAudio: audio,
        //   negotiateVideo: video,
        // })

        // return buildCall({
        //   strategy: 'room',
        //   params: {
        //     token: this.options.token,
        //   },
        //   userParams: {
        //     // @ts-expect-error
        //     host: this.options.host,
        //     destinationNumber: params.to,
        //     ...params,
        //   },
        // })
      } catch (error) {
        getLogger().error('WSClient dial', error)

        reject(error)
      }
    })
  }

  // FIXME: params
  async _acceptVertoInvite(jsonrpc: any, nodeId: string) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('WSClient _acceptVertoInvite with:', jsonrpc)

        // TODO: auto connect?
        // await this.connect()

        // const {
        //   audio: audioFromConstructor = true,
        //   video: videoFromConstructor = true,
        //   iceServers,
        //   rootElement,
        //   applyLocalVideoOverlay = true,
        //   stopCameraWhileMuted = true,
        //   stopMicrophoneWhileMuted = true,
        //   speakerId,
        //   destinationNumber,
        //   watchMediaPackets,
        //   watchMediaPacketsTimeout,
        //   ...userOptions
        // } = params

        const { params } = jsonrpc

        const call = this.wsClient.rooms.makeRoomObject({
          // audio,
          // video: video === true ? VIDEO_CONSTRAINTS : video,
          negotiateAudio: true,
          negotiateVideo: true,
          // iceServers,
          rootElement: this.options.rootElement,
          applyLocalVideoOverlay: true,
          stopCameraWhileMuted: true,
          stopMicrophoneWhileMuted: true,
          // speakerId,
          watchMediaPackets: false,
          // watchMediaPacketsTimeout:,

          remoteSdp: params.sdp,
          prevCallId: params.callID,
          nodeId,
        })

        // WebRTC connection left the room.
        call.once('destroy', () => {
          getLogger().debug('RTC Connection Destroyed')
        })

        // @ts-expect-error
        call.attachPreConnectWorkers()

        // @ts-expect-error
        await call.answer()

        // // @ts-expect-error
        // call.attachOnSubscribedWorkers(payload)

        getLogger().debug('Resolving Call..')
        resolve(call)
      } catch (error) {
        getLogger().error('WSClient dial', error)

        reject(error)
      }
    })
  }
}
