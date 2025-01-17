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
import { FabricRoomSession } from './FabricRoomSession'
import { createClient } from './createClient'
import { Client } from './Client'

export class WSClient {
  private wsClient: Client
  private logger = getLogger()
  private _sessionConnected = false
  private _incomingCallManager: IncomingCallManager

  constructor(public options: WSClientOptions) {
    this.wsClient = createClient(this.options)
    this._incomingCallManager = new IncomingCallManager(
      (payload: IncomingInvite, params: CallParams) =>
        this.buildInboundCall(payload, params),
      (callId: string, nodeId: string) => this.executeVertoBye(callId, nodeId)
    )
    this.listenForSessionEvents()
  }

  /** @internal */
  get clientApi() {
    return this.wsClient
  }

  get sessionConnected() {
    return this._sessionConnected
  }

  private listenForSessionEvents() {
    this.wsClient.session.on('session.connected', () => {
      this._sessionConnected = true
    })

    this.wsClient.session.on('session.disconnected', () => {
      this._sessionConnected = false
    })
  }

  async connect() {
    if (!this.sessionConnected) {
      await this.wsClient.connect()

      this.wsClient.runWorker('wsClientWorker', {
        worker: wsClientWorker,
        initialState: {
          buildInboundCall: (incomingInvite: Omit<IncomingInvite, 'source'>) =>
            this.notifyIncomingInvite('websocket', incomingInvite),
        },
      })
    }
  }

  disconnect() {
    return this.wsClient.disconnect()
  }

  async dial(params: DialParams) {
    return new Promise<FabricRoomSession>(async (resolve, reject) => {
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
    return new Promise<FabricRoomSession>(async (resolve, reject) => {
      try {
        await this.connect()
        const call = this.buildOutboundCall({ ...params, attach: true })
        resolve(call)
      } catch (error) {
        getLogger().error('Unable to connect and reattach a call', error)
        reject(error)
      }
    })
  }

  private buildOutboundCall(params: DialParams & { attach?: boolean }) {
    const [pathname, query] = params.to.split('?')
    if (!pathname) {
      throw new Error('Invalid destination address')
    }

    let video = false
    let negotiateVideo = false

    const queryParams = new URLSearchParams(query)
    const channel = queryParams.get('channel')
    if (channel === 'video') {
      video = true
      negotiateVideo = true
    }

    const call = this.wsClient.makeFabricObject({
      audio: params.audio ?? true,
      video: params.video ?? video,
      negotiateAudio: params.negotiateAudio ?? true,
      negotiateVideo: params.negotiateVideo ?? negotiateVideo,
      rootElement: params.rootElement || this.options.rootElement,
      applyLocalVideoOverlay: true,
      applyMemberOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      watchMediaPackets: false,
      destinationNumber: pathname,
      nodeId: params.nodeId,
      attach: params.attach ?? false,
      disableUdpIceServers: params.disableUdpIceServers || false,
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

  private buildInboundCall(payload: IncomingInvite, params: CallParams) {
    const call = this.wsClient.makeFabricObject({
      audio: params.audio ?? true,
      video: params.video ?? true,
      negotiateAudio: params.negotiateAudio ?? true,
      negotiateVideo: params.negotiateVideo ?? true,
      rootElement: params.rootElement || this.options.rootElement,
      applyLocalVideoOverlay: true,
      applyMemberOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      watchMediaPackets: false,
      nodeId: payload.nodeId,
      remoteSdp: payload.sdp,
      prevCallId: payload.callID,
      disableUdpIceServers: params.disableUdpIceServers || false,
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

    // TODO: This is for memberList.updated event and it is not yet supported in CF SDK
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
