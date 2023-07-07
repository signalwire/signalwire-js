import { type UserOptions, getLogger, VertoSubscribe } from '@signalwire/core'
import { createClient } from '../createClient'
import { WSClientWorker } from './WSClientWorker'

interface PushNotification {
  encryption_type: 'aes_256_gcm'
  notification_uuid: string
  with_video: 'true' | 'false'
  incoming_caller_name: string
  incoming_caller_id: string
  tag: string
  invite: string
  title: string
  type: 'call_invite'
  iv: string
  version: string
  decrypted: Record<string, any>
}

interface WSClientOptions extends UserOptions {
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

  async dial(params: { to: string; nodeId?: string }) {
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
          nodeId: params.nodeId,
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

        // @ts-expect-error
        call.emitter.once('verto.display', () => resolve(call))

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

  handlePushNotification(payload: PushNotification) {
    return new Promise(async (resolve, reject) => {
      const { decrypted, type } = payload
      if (type !== 'call_invite') {
        this.logger.warn('Unknown notification type', payload)
        return
      }
      this.logger.debug('handlePushNotification', payload)
      const { params: jsonrpc, node_id: nodeId } = decrypted
      const {
        params: {
          callID,
          sdp,
          caller_id_name,
          caller_id_number,
          callee_id_name,
          callee_id_number,
          display_direction,
        },
      } = jsonrpc
      this.logger.debug('handlePushNotification data', {
        callID,
        sdp,
        caller_id_name,
        caller_id_number,
        callee_id_name,
        callee_id_number,
        display_direction,
      })
      try {
        // Connect the client first
        await this.connect()
        // Send verto.subscribe
        await this.executeVertoSubscribe(callID, nodeId)

        // Build the Call object and return to the user

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
          negotiateAudio: true,
          negotiateVideo: true,
          rootElement: this.options.rootElement,
          applyLocalVideoOverlay: true,
          stopCameraWhileMuted: true,
          stopMicrophoneWhileMuted: true,
          // speakerId,
          watchMediaPackets: false,
          // watchMediaPacketsTimeout:,

          remoteSdp: sdp,
          prevCallId: callID,
          nodeId,
        })

        // WebRTC connection left the room.
        call.once('destroy', () => {
          getLogger().debug('RTC Connection Destroyed')
        })

        // @ts-expect-error
        call.attachPreConnectWorkers()

        // // @ts-expect-error
        // call.attachOnSubscribedWorkers(payload)

        getLogger().debug('Resolving Call', call)
        resolve({ resultType: 'inboundCall', resultObject: call })
      } catch (error) {
        reject(error)
      }
    })
  }

  private async executeVertoSubscribe(callId: string, nodeId: string) {
    try {
      // @ts-expect-error
      return await this.wsClient.execute({
        method: 'webrtc.verto',
        params: {
          callID: callId,
          node_id: nodeId,
          subscribe: [],
          message: VertoSubscribe({
            sessid: callId,
            eventChannel: [],
          }),
        },
      })
    } catch (error) {
      this.logger.warn('The call is not available anymore', callId)
      throw error
    }
  }
}
