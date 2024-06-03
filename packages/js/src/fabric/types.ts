import { type UserOptions } from '@signalwire/core'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import { Conversation } from './Conversation'
import { CallFabricRoomSession } from './CallFabricRoomSession'

export interface SignalWireOptions extends WSClientOptions {}

export interface SignalWireContract {
  httpHost: HTTPClient['httpHost']
  registerDevice: HTTPClient['registerDevice']
  unregisterDevice: HTTPClient['unregisterDevice']
  getSubscriberInfo: HTTPClient['getSubscriberInfo']
  connect: WSClient['connect']
  disconnect: WSClient['disconnect']
  online: WSClient['online']
  offline: WSClient['offline']
  dial: WSClient['dial']
  handlePushNotification: WSClient['handlePushNotification']
  updateToken: WSClient['updateToken']
  address: {
    getAddresses: HTTPClient['getAddresses']
    getAddress: HTTPClient['getAddress']
  }
  conversation: {
    getConversations: Conversation['getConversations']
    getMessages: Conversation['getMessages']
    getConversationMessages: Conversation['getConversationMessages']
    subscribe: Conversation['subscribe']
    sendMessage: Conversation['sendMessage']
  }
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

export interface CallOptions {
  /** HTML element in which to display the video stream */
  rootElement?: HTMLElement
  /** Disable ICE UDP transport policy */
  disableUdpIceServers?: boolean
  /** Audio constraints to use when joining the room. Default: `true`. */
  audio?: MediaStreamConstraints['audio']
  /** Video constraints to use when joining the room. Default: `true`. */
  video?: MediaStreamConstraints['video']
  /** User & UserAgent metadata */
  userVariables?: { [key: string]: any }
}

export interface DialParams extends CallOptions {
  to: string
  nodeId?: string
}

export interface WSClientOptions extends UserOptions {
  /** HTML element in which to display the video stream */
  rootElement?: HTMLElement
  /** Call back function to receive the incoming call */
  incomingCallHandlers?: IncomingCallHandlers
  /** User & UserAgent metadata */
  userVariables?: Record<string, any>
}

export type InboundCallSource = 'websocket' | 'pushNotification'

export interface IncomingInvite {
  source: InboundCallSource
  callID: string
  sdp: string
  caller_id_name: string
  caller_id_number: string
  callee_id_name: string
  callee_id_number: string
  display_direction: string
  nodeId: string
}

export interface IncomingCallNotification {
  invite: {
    details: IncomingInvite
    accept: (param: CallOptions) => Promise<CallFabricRoomSession>
    reject: () => Promise<void>
  }
}
export type IncomingCallHandler = (
  notification: IncomingCallNotification
) => void

export interface IncomingCallHandlers {
  all?: IncomingCallHandler
  pushNotification?: IncomingCallHandler
  websocket?: IncomingCallHandler
}
