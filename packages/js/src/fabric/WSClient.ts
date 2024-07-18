import { getLogger, VertoSubscribe, VertoBye } from '@signalwire/core'
import { wsClientWorker } from './workers'
import {
  CallParams,
  DialParams,
  InboundCallSource,
  IncomingInvite,
  OnlineParams,
  PushNotificationPayload,
  WSClientOptions,
} from './types'
import { IncomingCallManager } from './IncomingCallManager'
import { CallFabricRoomSession } from './CallFabricRoomSession'
import { createClient } from './createClient'
import { Client } from './Client'

type BuildRoomParams = Omit<DialParams, 'to'> & {
  attach: boolean
  callID?: string
  nodeId?: string
  sdp?: string
  to?: string
};
export class WSClient {
  private wsClient: Client
  private logger = getLogger()
  private _incomingCallManager: IncomingCallManager

  constructor(public options: WSClientOptions) {
    this.wsClient = createClient(this.options)
    this._incomingCallManager = new IncomingCallManager(
      (payload: IncomingInvite, params: CallParams) =>
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
    return this.connectAndbuildRoomSession({ ...params, attach: false })
  }

  async reattach(params: DialParams) {
    return this.connectAndbuildRoomSession({ ...params, attach: true })
  }

  private async connectAndbuildRoomSession(params: BuildRoomParams) {
    return new Promise<CallFabricRoomSession>(async (resolve, reject) => {
      try {
        await this.connect()
        const call = this.buildRoomSession(params)
        resolve(call)
      } catch (error) {
        getLogger().error('WSClient', error)
        reject(error)
      }
    })
  }

  private buildRoomSession(params: BuildRoomParams) {
    const { to, callID, nodeId, sdp } = params

    let video = params.video ?? true

    if (to) {
      const channelRegex = /\?channel\=(?<channel>(audio|video))/
      const result = channelRegex.exec(to)

      if (result && result.groups?.channel === 'audio') {
        video = false
      }
    }

    const call = this.wsClient.makeCallFabricObject({
      audio: params.audio ?? true,
      video,
      negotiateAudio: true,
      negotiateVideo: true,
      rootElement: params.rootElement || this.options.rootElement,
      applyLocalVideoOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      destinationNumber: params.to,
      watchMediaPackets: false,
      remoteSdp: sdp,
      prevCallId: callID,
      nodeId,
      disableUdpIceServers: params.disableUdpIceServers || false,
      attach: params.attach,
      userVariables: params.userVariables || this.options.userVariables,
    })

    // WebRTC connection left the room.
    call.once('destroy', () => {
      this.logger.debug('RTC Connection Destroyed')
      call.destroy()
    })

    this.wsClient.once('session.disconnected', () => {
      this.logger.debug('Session Disconnected')
    })

    // @ts-expect-error
    call.attachPreConnectWorkers()
    return call
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
      return await this.wsClient.execute<unknown, void>({
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
      return await this.wsClient.execute<unknown, void>({
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

  private buildInboundCall(payload: IncomingInvite, params: CallParams) {
    getLogger().debug('Build new call to answer')

    const { callID, nodeId, sdp } = payload
    return this.buildRoomSession({
      ...params,
      attach: false,
      callID,
      nodeId,
      sdp,
    })
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
      this.wsClient.reauthenticate(token)
    })
  }

  /**
   * Mark the client as 'online' to receive calls over WebSocket
   */
  async online({ incomingCallHandlers }: OnlineParams) {
    this._incomingCallManager.setNotificationHandlers(incomingCallHandlers)
    await this.connect()
    return this.wsClient.execute<unknown, void>({
      method: 'subscriber.online',
      params: {},
    })
  }

  /**
   * Mark the client as 'offline' to receive calls over WebSocket
   */
  offline() {
    this._incomingCallManager.setNotificationHandlers({})
    return this.wsClient.execute<unknown, void>({
      method: 'subscriber.offline',
      params: {},
    })
  }
}
