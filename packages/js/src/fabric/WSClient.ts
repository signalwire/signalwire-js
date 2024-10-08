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
import { sdpHasMediaDescription } from '@signalwire/webrtc'

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
    return new Promise<CallFabricRoomSession>(async (resolve, reject) => {
      try {
        await this.connect()
        const call = this.buildOutboundCall(params)
        resolve(call)
      } catch (error) {
        getLogger().error('Unable to connect and dial a call', error)
        reject(error)
      }
    })
  }

  async reattach(params: DialParams) {
    return new Promise<CallFabricRoomSession>(async (resolve, reject) => {
      try {
        await this.connect()
        const call = this.buildOutboundCall({ ...params, reattach: true })
        resolve(call)
      } catch (error) {
        getLogger().error('Unable to connect and reattach a call', error)
        reject(error)
      }
    })
  }

  private buildOutboundCall(params: DialParams & { reattach?: boolean }) {
    let video = true
    let negotiateVideo = true

    const toURL = new URL(`address:${params.to}`)

    if (params.to && toURL.searchParams.get('channel') === 'audio') {
      video = false
      negotiateVideo = false
    }

    const call = this.wsClient.makeCallFabricObject({
      audio: params.audio ?? true,
      video: params.video ?? video,
      negotiateAudio: params.negotiateAudio ?? true,
      negotiateVideo: params.negotiateVideo ?? negotiateVideo,
      rootElement: params.rootElement || this.options.rootElement,
      applyLocalVideoOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      destinationNumber: toURL.pathname,
      watchMediaPackets: false,
      disableUdpIceServers: params.disableUdpIceServers || false,
      userVariables: params.userVariables || this.options.userVariables,
      nodeId: params.nodeId,
      attach: params.reattach || false,
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

  private buildInboundCall(payload: IncomingInvite, params: CallParams) {
    let video = true
    let audio = true
    let negotiateAudio = true
    let negotiateVideo = true

    const remoteSdp = payload.sdp
    if (!sdpHasMediaDescription(remoteSdp, 'video')) {
      video = false
      negotiateVideo = false
    }
    if (!sdpHasMediaDescription(remoteSdp, 'audio')) {
      audio = false
      negotiateAudio = false
    }

    const call = this.wsClient.makeCallFabricObject({
      audio: params.audio ?? audio,
      video: params.video ?? video,
      negotiateAudio: negotiateAudio,
      negotiateVideo: negotiateVideo,
      rootElement: params.rootElement || this.options.rootElement,
      applyLocalVideoOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      watchMediaPackets: false,
      disableUdpIceServers: params.disableUdpIceServers || false,
      userVariables: params.userVariables || this.options.userVariables,
      prevCallId: payload.callID,
      nodeId: payload.nodeId,
      remoteSdp: payload.sdp,
    })

    // WebRTC connection left the room.
    call.once('destroy', () => {
      this.logger.debug('RTC Connection Destroyed')
      call.destroy()
    })

    this.wsClient.once('session.disconnected', () => {
      this.logger.debug('Session Disconnected')
    })

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
