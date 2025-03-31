import {
  actions,
  BaseClient,
  CallJoinedEventParams as InternalCallJoinedEventParams,
  selectors,
  VertoBye,
  VertoSubscribe,
  VideoRoomSubscribedEventParams,
} from '@signalwire/core'
import { MakeRoomOptions } from '../video'
import { createFabricRoomSessionObject } from './FabricRoomSession'
import { buildVideoElement } from '../buildVideoElement'
import {
  CallParams,
  DialParams,
  FabricRoomSession,
  IncomingInvite,
  OnlineParams,
  HandlePushNotificationParams,
  WSClientOptions,
  HandlePushNotificationResult,
} from './interfaces'
import { IncomingCallManager } from './IncomingCallManager'
import { wsClientWorker } from './workers'
import { createWSClient } from './createWSClient'
import { ReattachParams, WSClientContract } from './interfaces/wsClient'
import { encodeAuthState } from './utils/helpers'

export class WSClient extends BaseClient<{}> implements WSClientContract {
  private _incomingCallManager: IncomingCallManager
  private _disconnected: boolean = false

  constructor(private wsClientOptions: WSClientOptions) {
    const client = createWSClient(wsClientOptions)
    super(client)

    this._incomingCallManager = new IncomingCallManager({
      client: this,
      buildInboundCall: this.buildInboundCall.bind(this),
      executeVertoBye: this.executeVertoBye.bind(this),
    })

    this.runWorker('wsClientWorker', {
      worker: wsClientWorker,
      initialState: {
        handleIncomingInvite: (invite: IncomingInvite) => {
          this._incomingCallManager.handleIncomingInvite({
            source: 'websocket',
            ...invite,
          })
        },
      },
    })
  }

  get authState() {
    const protocol = this.select(selectors.getProtocol)
    const authState = this.select(selectors.getAuthorizationState)
    return encodeAuthState({ authState: authState, protocol })
  }

  private makeFabricObject(makeRoomOptions: MakeRoomOptions) {
    const {
      rootElement,
      applyLocalVideoOverlay = true,
      applyMemberOverlay = true,
      stopCameraWhileMuted = true,
      stopMicrophoneWhileMuted = true,
      mirrorLocalVideoOverlay = true,
      ...options
    } = makeRoomOptions

    const room = createFabricRoomSessionObject({
      ...options,
      store: this.store,
    })

    /**
     * If the user provides a `rootElement` we'll
     * automatically handle the Video element for them
     */
    if (rootElement) {
      try {
        buildVideoElement({
          applyLocalVideoOverlay,
          applyMemberOverlay,
          mirrorLocalVideoOverlay,
          room,
          rootElement,
        })
      } catch (error) {
        this.logger.error('Unable to build the video element automatically')
      }
    }

    /**
     * If the user joins with `join_video_muted: true` or
     * `join_audio_muted: true` we'll stop the streams
     * right away.
     */
    const joinMutedHandler = (
      params: InternalCallJoinedEventParams | VideoRoomSubscribedEventParams
    ) => {
      const member = params.room_session.members?.find(
        // @ts-expect-error FIXME:
        (m) => m.id === room.memberId || m.member_id === room.memberId
      )

      if (member?.audio_muted) {
        try {
          room.stopOutboundAudio()
        } catch (error) {
          this.logger.error('Error handling audio_muted', error)
        }
      }

      if (member?.video_muted) {
        try {
          room.stopOutboundVideo()
        } catch (error) {
          this.logger.error('Error handling video_muted', error)
        }
      }
    }

    room.on('room.subscribed', joinMutedHandler)

    /**
     * Stop and Restore outbound audio on audio_muted event
     */
    if (stopMicrophoneWhileMuted) {
      room.on('member.updated.audioMuted', ({ member }) => {
        try {
          if (member.member_id === room.memberId && 'audio_muted' in member) {
            member.audio_muted
              ? room.stopOutboundAudio()
              : room.restoreOutboundAudio()
          }
        } catch (error) {
          this.logger.error('Error handling audio_muted', error)
        }
      })
    }

    /**
     * Stop and Restore outbound video on video_muted event
     */
    if (stopCameraWhileMuted) {
      room.on('member.updated.videoMuted', ({ member }) => {
        try {
          if (member.member_id === room.memberId && 'video_muted' in member) {
            member.video_muted
              ? room.stopOutboundVideo()
              : room.restoreOutboundVideo()
          }
        } catch (error) {
          this.logger.error('Error handling video_muted', error)
        }
      })
    }

    return room
  }

  private buildOutboundCall(
    params: DialParams & { attach?: boolean; prevCallId?: string }
  ) {
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

    const call = this.makeFabricObject({
      audio: params.audio ?? true,
      video: params.video ?? video,
      negotiateAudio: params.negotiateAudio ?? true,
      negotiateVideo: params.negotiateVideo ?? negotiateVideo,
      rootElement: params.rootElement || this.wsClientOptions.rootElement,
      applyLocalVideoOverlay: true,
      applyMemberOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      watchMediaPackets: false,
      destinationNumber: params.to,
      nodeId: params.nodeId,
      attach: params.attach ?? false,
      prevCallId: params.prevCallId,
      disableUdpIceServers: params.disableUdpIceServers || false,
      userVariables: params.userVariables || this.wsClientOptions.userVariables,
    })

    // WebRTC connection left the room.
    call.once('destroy', () => {
      this.logger.debug('RTC Connection Destroyed')
      call.destroy()
    })

    this.session.once('session.disconnected', () => {
      this.logger.debug('Session Disconnected')
      call.destroy()
      this.destroy()
    })

    // TODO: This is for memberList.updated event and it is not yet supported in CF SDK
    // @ts-expect-error
    call.attachPreConnectWorkers()
    return call
  }

  private buildInboundCall(payload: IncomingInvite, params: CallParams) {
    const call = this.makeFabricObject({
      audio: params.audio ?? true,
      video: params.video ?? true,
      negotiateAudio: params.negotiateAudio ?? true,
      negotiateVideo: params.negotiateVideo ?? true,
      rootElement: params.rootElement || this.wsClientOptions.rootElement,
      applyLocalVideoOverlay: true,
      applyMemberOverlay: true,
      stopCameraWhileMuted: true,
      stopMicrophoneWhileMuted: true,
      watchMediaPackets: false,
      nodeId: payload.nodeId,
      remoteSdp: payload.sdp,
      prevCallId: payload.callID,
      disableUdpIceServers: params.disableUdpIceServers || false,
      userVariables: params.userVariables || this.wsClientOptions.userVariables,
    })

    // WebRTC connection left the room.
    call.once('destroy', () => {
      this.logger.debug('RTC Connection Destroyed')
      call.destroy()
    })

    this.session.once('session.disconnected', () => {
      this.logger.debug('Session Disconnected')
      call.destroy()
      this.destroy()
    })

    // TODO: This is for memberList.updated event and it is not yet supported in CF SDK
    // @ts-expect-error
    call.attachPreConnectWorkers()
    return call
  }

  private async executeVertoBye(callId: string, nodeId: string) {
    try {
      return await this.execute<unknown, void>({
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
      return await this.execute<unknown, void>({
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

  public override disconnect() {
    return new Promise<void>((resolve, _reject) => {
      if (this._disconnected) {
        resolve()
      }

      this.session.once('session.disconnected', () => {
        this.destroy()
        resolve()
        this._disconnected = true
      })

      super.disconnect()
    })
  }

  public async dial(params: DialParams) {
    return new Promise<FabricRoomSession>(async (resolve, reject) => {
      try {
        const call = this.buildOutboundCall(params)
        resolve(call)
      } catch (error) {
        this.logger.error('Unable to connect and dial a call', error)
        reject(error)
      }
    })
  }

  public async reattach(params: ReattachParams) {
    return new Promise<FabricRoomSession>(async (resolve, reject) => {
      try {
        if (!params.callId) {
          throw new Error('Call ID is required to reattach')
        }
        const call = this.buildOutboundCall({
          ...params,
          attach: true,
          prevCallId: params.callId,
        })
        resolve(call)
      } catch (error) {
        this.logger.error('Unable to connect and reattach a call', error)
        reject(error)
      }
    })
  }

  public handlePushNotification(params: HandlePushNotificationParams) {
    return new Promise<HandlePushNotificationResult>(
      async (resolve, reject) => {
        const { decrypted, type } = params
        if (type !== 'call_invite') {
          this.logger.warn('Unknown notification type', params)
          reject('Unknown notification type')
        }
        this.logger.debug('handlePushNotification', params)
        const {
          params: { params: payload },
          node_id: nodeId,
        } = decrypted
        try {
          // Catch the error temporarly
          try {
            // Send verto.subscribe
            await this.executeVertoSubscribe(payload.callID, nodeId)
          } catch (error) {
            this.logger.warn('Verto Subscribe', error)
          }

          this._incomingCallManager.handleIncomingInvite({
            source: 'pushNotification',
            nodeId,
            ...payload,
          })

          resolve({ resultType: 'inboundCall' })
        } catch (error) {
          reject(error)
        }
      }
    )
  }

  public updateToken(token: string) {
    return new Promise<void>((resolve, reject) => {
      this.session.once('session.auth_error', (error) => {
        reject(error)
      })
      this.session.once('session.connected', () => {
        resolve()
      })
      this.store.dispatch(actions.reauthAction({ token }))
    })
  }

  /**
   * Mark the client as 'online' to receive calls over WebSocket
   */
  public async online({ incomingCallHandlers }: OnlineParams) {
    this._incomingCallManager.setNotificationHandlers(incomingCallHandlers)
    return this.execute<unknown, void>({
      method: 'subscriber.online',
      params: {},
    })
  }

  /**
   * Mark the client as 'offline' to receive calls over WebSocket
   */
  public offline() {
    this._incomingCallManager.setNotificationHandlers({})
    return this.execute<unknown, void>({
      method: 'subscriber.offline',
      params: {},
    })
  }
}
