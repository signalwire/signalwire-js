import { type UserOptions, getLogger, VertoSubscribe, VertoBye } from '@signalwire/core'
import { Client } from '../Client'
import { RoomSession } from '../RoomSession'
import { createClient } from '../createClient'
import { wsClientWorker, unifiedEventsWatcher } from './workers'
import { BaseRoomSession } from '../BaseRoomSession'

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

interface IncomingCallHandlerParams {
  source: 'websocket' | 'pushNotification'
  invite: {
    details: {
      callID: string,
      sdp: string,
      caller_id_name: string,
      caller_id_number: string,
      callee_id_name: string,
      callee_id_number: string,
      display_direction: string,
    }
    accept: ({rootElement}: {rootElement: HTMLElement| undefined}) => Promise<BaseRoomSession<RoomSession>>,
    reject: () => Promise<void>
  }
}

export interface WSClientOptions extends UserOptions {
  /** HTML element in which to display the video stream */
  rootElement?: HTMLElement
  /** Disable ICE UDP transport policy */
  disableUdpIceServers?: boolean
}

export class WSClient {
  private wsClient: Client<RoomSession>
  private logger = getLogger()

  constructor(public options: WSClientOptions) {
    this.wsClient = createClient<RoomSession>({
      host: this.options.host,
      token: this.options.token,
      debug: {
        logWsTraffic: true,
      },
      logLevel: 'debug',
      unifiedEventing: true,
    })
  }

  private _incomingCallHandler(invite: IncomingCallHandlerParams) {
    // TODO apply source filter and fire callback
  }

  get clientApi() {
    return this.wsClient
  }

  connect() {
    // @ts-ignore
    this.wsClient.runWorker('wsClientWorker', {
      worker: wsClientWorker,
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
          eventsWatcher: unifiedEventsWatcher,
          disableUdpIceServers: this.options.disableUdpIceServers || false,
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
        call.start = () => {
          return new Promise(async (resolve, reject) => {
            try {
              // @ts-expect-error
              call.once('verto.display', () => resolve(call))
              call.once('room.subscribed', () => resolve(call))

              await call.join()
            } catch (error) {
              getLogger().error('WSClient call start', error)

              reject(error)
            }
          })
        }

        resolve(call)
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

        // Catch the error temporarly
        try {
          // Send verto.subscribe
          await this.executeVertoSubscribe(callID, nodeId)
        } catch (error) {
          this.logger.warn('Verto Subscribe', error)
        }

        const roomBuilder = async (rootElement: HTMLElement | undefined) => {
          const call = this.wsClient.rooms.makeRoomObject({
            //   ^?
            negotiateAudio: true,
            negotiateVideo: true,
            rootElement: rootElement,
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

          // @ts-expect-error
          await call.answer();

          return call
        }

        const reject = () => {
          return this._executeVertoBye(callID, nodeId)
        }

        this._incomingCallHandler({source: 'pushNotification', invite: {
          details: {
            callID,
            sdp,
            caller_id_name,
            caller_id_number,
            callee_id_name,
            callee_id_number,
            display_direction
          },
          accept: ({rootElement}: {rootElement: HTMLElement| undefined}) => roomBuilder(rootElement),
          reject: () => reject()
          }
        })
        resolve({ resultType: 'inboundCall'})
      } catch (error) {
        reject(error)
      }
    })
  }

  private async _executeVertoBye(callId: string, nodeId: string) {
    try {
      // @ts-expect-error
      return await this.wsClient.execute({
        method: 'webrtc.verto',
        params: {
          callID: callId,
          node_id: nodeId,
          message: VertoBye({
            cause: 'USER_BUSY',
            causeCode: '17',
            dialogParams: { callID: callId }
          })
        }
      })
    } catch(error) {
      this.logger.warn('The call is not available anymore', callId)
      throw error
    }
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

  updateToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wsClient.once('session.auth_error', (error) => {
        reject(error)
      })
      this.wsClient.once('session.connected', () => {
        resolve()
      })

      // @ts-expect-error
      this.wsClient.reauthenticate(token)
    })
  }
}
