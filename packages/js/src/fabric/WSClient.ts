import {
  getLogger,
  VertoSubscribe,
  VertoBye,
  VideoRoomSubscribedEventParams,
} from '@signalwire/core'
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
import { getStorage } from '../utils/storage'
import { UNSAFE_PROP_ACCESS } from '../RoomSession'

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
    return this.connectAndbuildCall(params)
  }

  async reattach(params: DialParams) {
    return this.connectAndbuildCall({ ...params, attach: true })
  }

  private async connectAndbuildCall(params: DialParams) {
    return new Promise<CallFabricRoomSession>(async (resolve, reject) => {
      try {
        await this.connect()
        const call = this.buildOutboundCall(params)
        resolve(call)
      } catch (error) {
        getLogger().error('Unable to connect and create a call', error)
        reject(error)
      }
    })
  }

  private buildOutboundCall(params: DialParams) {
    let video = params.video ?? true
    let negotiateVideo = true

    const channelRegex = /\?channel\=(?<channel>(audio|video))/
    const result = channelRegex.exec(params.to)

    if (result && result.groups?.channel === 'audio') {
      video = false
      negotiateVideo = false
    }

    const allowReattach = params.attach !== false
    const callIdKey = `ci-${params.to}`
    const reattachManager = {
      joined: ({ call_id }: VideoRoomSubscribedEventParams) => {
        if (allowReattach && callIdKey) {
          getStorage()?.setItem(callIdKey, call_id)
        }
      },
      init: () => {
        if (allowReattach) {
          call.on('room.subscribed', reattachManager.joined)
        }
        call.options.prevCallId = reattachManager.getPrevCallId()
      },
      destroy: () => {
        if (!allowReattach) {
          return
        }
        call.off('room.subscribed', reattachManager.joined)
        if (callIdKey) {
          getStorage()?.removeItem(callIdKey)
        }
      },
      getPrevCallId: () => {
        if (!allowReattach || !callIdKey) {
          return
        }
        return getStorage()?.getItem(callIdKey) ?? undefined
      },
    }

    const call = this.wsClient.makeCallFabricObject({
      audio: params.audio ?? true,
      video,
      negotiateAudio: params.negotiateAudio ?? true,
      negotiateVideo: params.negotiateVideo ?? negotiateVideo,
      rootElement: params.rootElement || this.options.rootElement,
      applyLocalVideoOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      destinationNumber: params.to,
      watchMediaPackets: false,
      disableUdpIceServers: params.disableUdpIceServers || false,
      userVariables: params.userVariables || this.options.userVariables,
      prevCallId: reattachManager.getPrevCallId(),
      attach:
        params.attach ?? reattachManager.getPrevCallId()?.length ? true : false,
    })

    // WebRTC connection left the room.
    call.once('destroy', () => {
      this.logger.debug('RTC Connection Destroyed')
      call.emit('room.left', { reason: call.leaveReason })

      // Remove callId to reattach
      reattachManager.destroy()
      call.destroy()
    })

    this.wsClient.once('session.disconnected', () => {
      this.logger.debug('Session Disconnected')
    })

    const start = () => {
      return new Promise<void>(async (resolve, reject) => {
        try {
          // @ts-expect-error
          call.attachPreConnectWorkers()

          call.once('room.subscribed', () => resolve())

          // Hijack previous callId if present
          reattachManager.init()

          await call.join()
        } catch (error) {
          getLogger().error('WSClient call start', error)
          reject(error)
        }
      })
    }

    const interceptors = { start }

    return new Proxy(call, {
      get(
        target: CallFabricRoomSession,
        prop: keyof CallFabricRoomSession,
        receiver: any
      ) {
        if (prop in interceptors) {
          // @ts-expect-error
          return interceptors[prop]
        }

        if (!target.active && UNSAFE_PROP_ACCESS.includes(prop)) {
          throw new Error(
            `Tried to access the property/method "${prop}" before the call was started. Please call call.start() first.`
          )
        }

        return Reflect.get(target, prop, receiver)
      },
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
    const { callID, nodeId, sdp } = payload

    const call = this.wsClient.makeCallFabricObject({
      audio: params.audio ?? true,
      video: params.audio ?? true,
      negotiateAudio: params.negotiateAudio ?? true,
      negotiateVideo: params.negotiateVideo ?? true,
      rootElement: params.rootElement || this.options.rootElement,
      applyLocalVideoOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      watchMediaPackets: false,
      disableUdpIceServers: params.disableUdpIceServers || false,
      userVariables: params.userVariables || this.options.userVariables,
      prevCallId: callID,
      nodeId,
      remoteSdp: sdp,
    })

    // WebRTC connection left the room.
    call.once('destroy', () => {
      this.logger.debug('RTC Connection Destroyed')
      call.emit('room.left', { reason: call.leaveReason })
      call.destroy()
    })

    this.wsClient.once('session.disconnected', () => {
      this.logger.debug('Session Disconnected')
    })

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
