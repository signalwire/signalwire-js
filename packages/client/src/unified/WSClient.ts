import {
  actions,
  BaseClient,
  CallSessionEventNames,
  CallJoinedEventParams as InternalCallJoinedEventParams,
  MemberUpdatedEventParams,
  VertoBye,
  VertoSubscribe,
} from '@signalwire/core'
import { sessionConnectionPoolWorker } from '@signalwire/webrtc'
import { MakeRoomOptions } from '../Client'
import { createCallSessionObject, CallSession } from './CallSession'
import { buildVideoElement } from '../buildVideoElement'
import {
  CallParams,
  DialParams,
  ReattachParams,
  IncomingInvite,
  OnlineParams,
  HandlePushNotificationParams,
  WSClientOptions,
  HandlePushNotificationResult,
} from './interfaces'
import { IncomingCallManager } from './IncomingCallManager'
import { wsClientWorker } from './workers'
import { createWSClient } from './createWSClient'
import { WSClientContract } from './interfaces/wsClient'
import { getCallIdKey, getStorage } from '../utils/storage'
import { CallSessionEvents } from '../utils/interfaces'

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

    // Initialize the session-level connection pool
    // This will start pre-warming connections as soon as the session is authorized
    this.initializeSessionConnectionPool()
  }

  private makeCallObject(makeRoomOptions: MakeRoomOptions) {
    const {
      rootElement,
      applyLocalVideoOverlay = true,
      applyMemberOverlay = true,
      stopCameraWhileMuted = true,
      stopMicrophoneWhileMuted = true,
      mirrorLocalVideoOverlay = true,
      ...options
    } = makeRoomOptions

    const instance = createCallSessionObject({
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
          callSessionInstance: instance,
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
    const joinMutedHandler = (params: InternalCallJoinedEventParams) => {
      const member = params.room_session.members?.find(
        (m) => m.member_id === instance.memberId
      )

      if (member?.audio_muted) {
        try {
          instance.stopOutboundAudio()
        } catch (error) {
          this.logger.error('Error handling audio_muted', error)
        }
      }

      if (member?.video_muted) {
        try {
          instance.stopOutboundVideo()
        } catch (error) {
          this.logger.error('Error handling video_muted', error)
        }
      }
    }

    instance.on('room.subscribed', joinMutedHandler)

    /**
     * Stop or Restore outbound audio on "member.updated" event
     */
    if (stopMicrophoneWhileMuted) {
      instance.on(
        'member.updated.audioMuted',
        (params: MemberUpdatedEventParams) => {
          const { member } = params
          try {
            if (
              member.member_id === instance.memberId &&
              'audio_muted' in member
            ) {
              member.audio_muted
                ? instance.stopOutboundAudio()
                : instance.restoreOutboundAudio()
            }
          } catch (error) {
            this.logger.error('Error handling audio_muted', error)
          }
        }
      )
    }

    /**
     * Stop or Restore outbound video on "member.updated" event
     */
    if (stopCameraWhileMuted) {
      instance.on(
        'member.updated.videoMuted',
        ({ member }: MemberUpdatedEventParams) => {
          try {
            if (
              member.member_id === instance.memberId &&
              'video_muted' in member
            ) {
              member.video_muted
                ? instance.stopOutboundVideo()
                : instance.restoreOutboundVideo()
            }
          } catch (error) {
            this.logger.error('Error handling video_muted', error)
          }
        }
      )
    }

    return instance
  }

  private buildOutboundCall(params: ReattachParams & { attach?: boolean }) {
    let video = false
    let negotiateVideo = false

    if (params.to) {
      const [pathname, query] = params.to.split('?')
      if (!pathname) {
        throw new Error('Invalid destination address')
      }

      const queryParams = new URLSearchParams(query)
      const channel = queryParams.get('channel')
      if (channel === 'video') {
        video = true
        negotiateVideo = true
      }
    }

    const call = this.makeCallObject({
      audio: params.audio ?? true,
      video: params.video ?? video,
      negotiateAudio: params.negotiateAudio ?? true,
      negotiateVideo: params.negotiateVideo ?? negotiateVideo,
      rootElement: params.rootElement || this.wsClientOptions.rootElement,
      applyLocalVideoOverlay: params.applyLocalVideoOverlay,
      applyMemberOverlay: params.applyMemberOverlay,
      stopCameraWhileMuted: params.stopCameraWhileMuted,
      stopMicrophoneWhileMuted: params.stopMicrophoneWhileMuted,
      mirrorLocalVideoOverlay: params.mirrorLocalVideoOverlay,
      watchMediaPackets: false,
      destinationNumber: params.to ?? '',
      nodeId: params.nodeId,
      attach: params.attach ?? false,
      disableUdpIceServers: params.disableUdpIceServers || false,
      userVariables: params.userVariables || this.wsClientOptions.userVariables,
      fromCallAddressId: params.fromCallAddressId,
      profileId: this.wsClientOptions.profileId,
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
    const call = this.makeCallObject({
      audio: params.audio ?? true,
      video: params.video ?? true,
      negotiateAudio: params.negotiateAudio ?? true,
      negotiateVideo: params.negotiateVideo ?? true,
      rootElement: params.rootElement || this.wsClientOptions.rootElement,
      applyLocalVideoOverlay: params.applyLocalVideoOverlay,
      applyMemberOverlay: params.applyMemberOverlay,
      stopCameraWhileMuted: params.stopCameraWhileMuted,
      stopMicrophoneWhileMuted: params.stopMicrophoneWhileMuted,
      mirrorLocalVideoOverlay: params.mirrorLocalVideoOverlay,
      watchMediaPackets: false,
      nodeId: payload.nodeId,
      remoteSdp: payload.sdp,
      prevCallId: payload.callID,
      disableUdpIceServers: params.disableUdpIceServers || false,
      userVariables: params.userVariables || this.wsClientOptions.userVariables,
      profileId: this.wsClientOptions.profileId,
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

  private async initializeCallSession(
    callSession: CallSession,
    params: DialParams | ReattachParams,
    operation: 'dial' | 'reattach'
  ): Promise<CallSession> {
    try {
      // Attach event listeners if provided
      if (params.listen && Object.keys(params.listen).length > 0) {
        this.attachEventListeners(callSession, params.listen)

        // start the call only if event listeners were attached
        await callSession.start()
      }

      return callSession
    } catch (error) {
      // Clean up on failure
      try {
        callSession.destroy()
      } catch (cleanupError) {
        this.logger.warn('Error during callSession cleanup:', cleanupError)
      }

      // Provide meaningful error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Unknown error occurred during ${operation}`
      this.logger.error(`Failed to ${operation}:`, error)
      throw new Error(
        `Failed to ${operation} to ${params.to}: ${errorMessage}`,
        {
          cause: error,
        }
      )
    }
  }

  public async dial(params: DialParams): Promise<CallSession> {
    // in case the user left the previous call with hangup, and is not reattaching
    getStorage()?.removeItem(getCallIdKey(this.options.profileId))

    const callSession = this.buildOutboundCall(params)
    return this.initializeCallSession(callSession, params, 'dial')
  }

  public async reattach(params: ReattachParams): Promise<CallSession> {
    const callSession = this.buildOutboundCall({ ...params, attach: true })
    return this.initializeCallSession(callSession, params, 'reattach')
  }

  public handlePushNotification(params: HandlePushNotificationParams) {
    const { incomingCallHandler } = params
    this._incomingCallManager.setNotificationHandlers({
      pushNotification: incomingCallHandler,
    })

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
          // Send verto.subscribe
          await this.executeVertoSubscribe(payload.callID, nodeId)

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
    if (incomingCallHandlers.all || incomingCallHandlers.pushNotification) {
      this.logger.warn(
        `Make sure the device is not registered to receive Push Notifications while it is online`
      )
    }
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

  /**
   * Attaches event listeners to a call session.
   * Handles errors in individual event handlers to prevent them from affecting other handlers.
   *
   * @param callSession The call session to attach listeners to
   * @param handlers The event handlers to attach
   */
  private attachEventListeners(
    callSession: CallSession,
    handlers: Partial<CallSessionEvents>
  ): void {
    Object.entries(handlers).forEach(([eventName, handler]) => {
      if (typeof handler === 'function') {
        // Wrap each handler to isolate errors
        this.logger.debug(`adding listener for event '${eventName}'`)
        const wrappedHandler = async (params: any) => {
          try {
            await handler(params)
          } catch (error) {
            this.logger.error(`Error in event handler for ${eventName}:`, error)
          }
        }

        callSession.on(eventName as CallSessionEventNames, wrappedHandler)
      }
    })
  }

  /**
   * Initialize the session-level connection pool
   */
  private initializeSessionConnectionPool() {
    this.runWorker('sessionConnectionPoolWorker', {
      worker: sessionConnectionPoolWorker,
      initialState: {
        poolSize: 1, // Only one connection per session is required
        iceCandidatePoolSize: 10,
      },
    })
  }
}
