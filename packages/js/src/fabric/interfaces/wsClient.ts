import { UserOptions } from '@signalwire/core'
import { IncomingCallHandlers } from './incomingCallManager'
import { FabricRoomSession } from '../FabricRoomSession'

export interface WSClientContract {
  /**
   * Disconnects the client from the SignalWire network.
   */
  disconnect(): Promise<void>
  /**
   * Dial a resource and connect the call
   *
   * @param params {@link DialParams}
   * @returns A promise resolving to the session object {@link FabricRoomSession}.
   */
  dial(params: DialParams): Promise<FabricRoomSession>
  /**
   * Reattach to the previous call if the previous call was not disconnected
   *
   * @param params {@link DialParams}
   * @returns A promise resolving to the session object {@link FabricRoomSession}.
   */
  reattach(params: DialParams): Promise<FabricRoomSession>
  /**
   * Handles the incoming call via Push Notification
   *
   * @param params {@link HandlePushNotificationParams}
   * @returns A promise resolving to the push notification result {@link HandlePushNotificationResult}.
   */
  handlePushNotification(
    params: HandlePushNotificationParams
  ): Promise<HandlePushNotificationResult>
  /**
   * Allow the user to update the authentication token.
   *
   * @param token string: The new authentication token.
   * @returns A promise that resolves when the token is successfully updated.
   */
  updateToken(token: string): Promise<void>
  /**
   * Mark the client as 'online' to receive calls over WebSocket.
   *
   * @param incomingCallHandlers - The handlers for processing incoming calls.
   * @returns A promise that resolves when the client is successfully marked as online.
   */
  online({ incomingCallHandlers }: OnlineParams): Promise<void>

  /**
   * Mark the client as 'offline' to stop receiving calls over WebSocket.
   *
   * @returns A promise that resolves when the client is successfully marked as offline.
   */
  offline(): Promise<void>
}

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

export type HandlePushNotificationParams = PushNotificationPayload

export interface HandlePushNotificationResult {
  resultType: 'inboundCall'
}

export interface CallParams {
  /** HTML element in which to display the video stream */
  rootElement?: HTMLElement | null
  /** Disable ICE UDP transport policy */
  disableUdpIceServers?: boolean
  /** Audio constraints to use when joining the room. Default: `true`. */
  audio?: MediaStreamConstraints['audio']
  /** Video constraints to use when joining the room. Default: `true` for "video" channel. */
  video?: MediaStreamConstraints['video']
  /** Negotiate the incoming audio from the RTC. Default: `true`. */
  negotiateAudio?: boolean
  /** Negotiate the incoming video from the RTC. Default: `true` for "video" channel. */
  negotiateVideo?: boolean
  /** User & UserAgent metadata */
  userVariables?: WSClientOptions['userVariables']
  /** OPUS audio codec max playback rate in Hz */
  maxOpusPlaybackRate?: number
}

export interface DialParams extends CallParams {
  to: string
  nodeId?: string
}

export type FabricUserOptions = Omit<UserOptions, 'onRefreshToken'>

export interface WSClientOptions extends FabricUserOptions {
  /** HTML element in which to display the video stream */
  rootElement?: HTMLElement
  /** Call back function to receive the incoming call */
  incomingCallHandlers?: IncomingCallHandlers
  /** User & UserAgent metadata */
  userVariables?: Record<string, any>
}
