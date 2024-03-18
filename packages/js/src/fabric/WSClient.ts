import {
  type UserOptions,
  getLogger,
  VertoSubscribe,
  VertoBye,
} from '@signalwire/core'
import { Client } from '../Client'
import { RoomSession } from '../RoomSession'
import { createClient } from '../createClient'
import { wsClientWorker } from './workers'
import {
  AcceptInviteParams,
  InboundCallSource,
  IncomingCallHandlers,
  IncomingCallManager,
  IncomingInvite,
} from './IncomingCallManager'

export interface OnlineParams {
  incomingCallHandlers: IncomingCallHandlers
}

export interface PushNotificationPayload {
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

export interface DialParams {
  to: string
  nodeId?: string
  rootElement?: HTMLElement
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
}

export interface WSClientOptions extends UserOptions {
  /** HTML element in which to display the video stream */
  rootElement?: HTMLElement
  /** Disable ICE UDP transport policy */
  disableUdpIceServers?: boolean
  /** Call back function to receive the incoming call */
  incomingCallHandlers?: IncomingCallHandlers
}

export class WSClient {
  private wsClient: Client<RoomSession>
  private logger = getLogger()
  private _incomingCallManager: IncomingCallManager

  constructor(public options: WSClientOptions) {
    this.wsClient = createClient<RoomSession>({
      ...this.options,
      unifiedEventing: true,
    })
    this._incomingCallManager = new IncomingCallManager(
      (payload: IncomingInvite, params: AcceptInviteParams) =>
        this.buildInboundCall(payload, params),
      (callId: string, nodeId: string) => this.executeVertoBye(callId, nodeId)
    )
  }

  /** @internal */
  get clientApi() {
    return this.wsClient
  }

  async connect() {
    // @ts-ignore
    if (!this.wsClient.connected) {
      // @ts-ignore
      this.wsClient.runWorker('wsClientWorker', {
        worker: wsClientWorker,
        initialState: {
          buildInboundCall: (incomingInvite: Omit<IncomingInvite, 'source'>) =>
            this.notifyIncomingInvite('websocket', incomingInvite),
        },
      })
      await this.wsClient.connect()
    }
  }

  disconnect() {
    return this.wsClient.disconnect()
  }

  async dial(params: DialParams) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.connect()
        const call = this.wsClient.rooms.makeRoomObject({
          audio: params.audio,
          video: params.video,
          negotiateAudio: true,
          negotiateVideo: true,
          // iceServers,
          rootElement: params.rootElement ?? this.options.rootElement,
          applyLocalVideoOverlay: true,
          stopCameraWhileMuted: true,
          stopMicrophoneWhileMuted: true,
          // speakerId,
          destinationNumber: params.to,
          watchMediaPackets: false,
          // watchMediaPacketsTimeout:,
          nodeId: params.nodeId,
          disableUdpIceServers: this.options.disableUdpIceServers || false,
          unifiedEventing: true,
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

  handlePushNotification(payload: PushNotificationPayload) {
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

        this.notifyIncomingInvite('pushNotification', {
          callID,
          sdp,
          caller_id_name,
          caller_id_number,
          callee_id_name,
          callee_id_number,
          display_direction,
          nodeId,
        })
        resolve({ resultType: 'inboundCall' })
      } catch (error) {
        reject(error)
      }
    })
  }

  private notifyIncomingInvite(
    source: InboundCallSource,
    buildCallParams: Omit<IncomingInvite, 'source'>
  ) {
    this._incomingCallManager.handleIncomingInvite({
      source,
      ...buildCallParams,
    })
  }

  private async executeVertoBye(callId: string, nodeId: string) {
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
            dialogParams: { callID: callId },
          }),
        },
      })
    } catch (error) {
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

  private buildInboundCall(
    payload: IncomingInvite,
    params: AcceptInviteParams
  ) {
    getLogger().debug('Build new call to answer')

    const { callID, nodeId, sdp } = payload

    const call = this.wsClient.rooms.makeRoomObject({
      audio: params.audio,
      video: params.video,
      negotiateAudio: true,
      negotiateVideo: true,
      rootElement: params.rootElement ?? this.options.rootElement,
      applyLocalVideoOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      watchMediaPackets: false,
      remoteSdp: sdp,
      prevCallId: callID,
      nodeId,
      disableUdpIceServers: this.options.disableUdpIceServers || false,
      unifiedEventing: true,
    })

    // WebRTC connection left the room.
    call.once('destroy', () => {
      getLogger().debug('RTC Connection Destroyed')
    })

    // @ts-expect-error
    call.attachPreConnectWorkers()

    getLogger().debug('Resolving Call', call)

    return call
  }

  /**
   * Allow user to update the auth token
   */
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

  /**
   * Mark the client as 'online' to receive calls over WebSocket
   */
  async online({ incomingCallHandlers }: OnlineParams) {
    this._incomingCallManager.setNotificationHandlers(incomingCallHandlers)

    await this.connect()

    // @ts-expect-error
    return this.wsClient.execute({
      method: 'subscriber.online',
      params: {},
    })
  }

  /**
   * Mark the client as 'offline' to receive calls over WebSocket
   */
  offline() {
    this._incomingCallManager.setNotificationHandlers({})
    // @ts-expect-error
    return this.wsClient.execute({
      method: 'subscriber.offline',
      params: {},
    })
  }
}
