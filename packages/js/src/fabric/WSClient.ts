import {
  type UserOptions,
  getLogger,
  VertoSubscribe,
  VertoBye,
} from '@signalwire/core'
import { Client } from '../Client'
import { RoomSession } from '../RoomSession'
import { createClient } from '../createClient'
import { wsClientWorker, unifiedEventsWatcher } from './workers'
import {
  InboundCallSource,
  IncomingCallHandlers,
  IncomingCallManager,
  IncomingInvite,
} from './IncomingCallManager'

export interface OnlineParams {
  incomingCallHandlers: IncomingCallHandlers
}
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

interface MakeRoomParams { 
  to?: string | undefined; 
  nodeId?: string | undefined;
  sdp?: string | undefined;
  callID?: string | undefined; 
  rootElement: HTMLElement | undefined; 
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
      (payload: IncomingInvite, rootElement: HTMLElement | undefined) =>
        this.buildInboundCall(payload, rootElement),
      (callId: string, nodeId: string) => this.executeVertoBye(callId, nodeId)
    )
  }

  /** @internal */
  get clientApi() {
    return this.wsClient
  }

  async connect() {
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

  disconnect() {
    return this.wsClient.disconnect()
  }

  async dial(params: {
    to: string
    nodeId?: string
    rootElement: HTMLElement | undefined
  }) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('WSClient dial with:', params)

        await this.connect()
        const callProxy = this._makeRoom(params)

        resolve(callProxy)
      } catch (error) {
        getLogger().error('WSClient dial', error)

        reject(error)
      }
    })
  }

  private _makeRoom(params: MakeRoomParams) {
    const call = this.wsClient.rooms.makeRoomObject({
      negotiateAudio: true,
      negotiateVideo: true,
      rootElement: params.rootElement ?? this.options.rootElement,
      applyLocalVideoOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      destinationNumber: params.to,
      watchMediaPackets: false,
      nodeId: params.nodeId,
      remoteSdp: params.sdp,
      prevCallId: params.callID,
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

    const notImplementedLocalFallback = async ({
      args, memberId, muted, updated, method,
    }: {
      args: any
      memberId: string
      muted: boolean
      updated: 'audio_muted' | 'video_muted'
      method: (params: any) => Promise<void>
    }) => {
      try {
        await method(args)
      } catch (e) {
        if (e.code === '501' && e.message === 'Not implemented') {
          this.logger.warn(
            'Received "Not implemented" from the server, handling localy only',
            { args, updated, muted }
          )
          call.emit(`member.updated.${updated}`, {
            member: { id: memberId, [`${updated}`]: muted },
          })
        }
      }
    }

    // @ts-expect-error
    call.start = () => {
      return new Promise(async (resolve, reject) => {
        try {
          // @ts-expect-error
          call.once('verto.display', () => resolve(callProxy))
          call.once('room.subscribed', () => resolve(callProxy))

          await call.join()
        } catch (error) {
          getLogger().error('WSClient call start', error)
          reject(error)
        }
      })
    }

    const callProxy = new Proxy(call, {
      get(target: typeof call, prop: keyof typeof call, receiver: any) {
        if (prop == 'audioMute')
          return async (params: any) => notImplementedLocalFallback({
            args: params,
            muted: true,
            updated: 'audio_muted',
            memberId: call.memberId,
            method: (p: any) => call.audioMute(p),
          })
        if (prop == 'audioUnmute')
          return async (params: any) => notImplementedLocalFallback({
            args: params,
            muted: false,
            updated: 'audio_muted',
            memberId: call.memberId,
            method: (p: any) => call.audioUnmute(p),
          })
        if (prop == 'videoMute')
          return async (params: any) => notImplementedLocalFallback({
            args: params,
            muted: true,
            updated: 'video_muted',
            memberId: call.memberId,
            method: (p: any) => call.videoMute(p),
          })
        if (prop == 'videoUnmute')
          return async (params: any) => notImplementedLocalFallback({
            args: params,
            muted: false,
            updated: 'video_muted',
            memberId: call.memberId,
            method: (p: any) => call.videoUnmute(p),
          })

        return Reflect.get(target, prop, receiver)
      },
    })
    return callProxy
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
    rootElement: HTMLElement | undefined
  ) {
    getLogger().debug('Build new call to answer')

    const { callID, nodeId, sdp } = payload

    console.log('this.wsClient', this.wsClient)
    console.log('this.wsClient.rooms', this.wsClient.rooms)
    console.log(
      'this.wsClient.rooms.makeRoomObject',
      this.wsClient.rooms.makeRoomObject
    )

    const call = this._makeRoom({nodeId, rootElement, sdp, callID})

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
  online({ incomingCallHandlers }: OnlineParams) {
    this._incomingCallManager.setNotificationHandlers(incomingCallHandlers)
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
