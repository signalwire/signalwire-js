/**
 * Welcome to the technical documentation for the Unified Client JavaScript SDK(a.k.a Call SDK).
 * @module
 */

export type {
  BaseComponentOptions,
  BaseConnectionState,
  ClientEvents,
  EmitterContract,
  RTCTrackEventName,
  UserOptions,
  SessionStatus,
  SessionEvents,
  VideoLayout,
  InternalVideoLayout,
  VideoPosition,
  VideoPositions,
  CallUpdatedEventParams,
  CallLeftEventParams,
  CallStateEventParams,
  CallPlayEventParams,
  CallConnectEventParams,
  CallRoomEventParams as CoreRoomEventParams,
  ConversationMessageEventName,
  ConversationMessageEvent,
  ConversationEventParams,
  ConversationEvent,
  // EventEmitter,
  SetAudioFlagsParams,
  CallSessionEventParams,
  CallLayoutChangedEventParams,
  MemberJoinedEventParams,
  MemberUpdatedEventParams,
  MemberLeftEventParams,
  MemberTalkingEventParams,
  MemberEventParams,
  MemberEntity,
  InternalMemberEntity,
} from '@signalwire/core'

export type {
  BaseConnectionOptions,
  ConnectionOptions,
  MicrophoneAnalyzer,
} from '@signalwire/webrtc'
export type {
  CallJoinedEventParams,
  RoomSessionObjectEventsHandlerMap,
  RoomSessionObjectEvents,
  RoomEventNames,
  StartScreenShareOptions,
  CallSessionEvents,
} from './utils/interfaces'
export type {
  // From interfaces/address.ts
  ResourceType,
  GetAddressResponse,
  Address,
  GetAddressesParams,
  GetAddressByIdParams,
  GetAddressByNameParams,
  GetAddressParams,
  GetAddressResult,
  GetAddressesResponse,
  GetAddressesResult,
  // From interfaces/capabilities.ts
  CapabilityOnOffStateContract,
  MemberCapabilityContract,
  CallCapabilitiesContract,
  // From interfaces/conversation.ts
  ConversationContract,
  SendConversationMessageParams,
  SendConversationMessageResponse,
  SendConversationMessageResult,
  GetConversationsParams,
  ConversationResponse,
  GetConversationsResponse,
  GetConversationsResult,
  ConversationSubscribeCallback,
  ConversationSubscribeResult,
  ConversationChatMessagesSubscribeParams,
  ConversationChatMessagesSubscribeResult,
  JoinConversationParams,
  JoinConversationResponse,
  JoinConversationResult,
  GetMessagesParams,
  ConversationMessage,
  GetMessagesResult,
  ConversationChatMessage,
  GetConversationChatMessageParams,
  GetConversationChatMessageResult,
  GetConversationMessagesResponse,
  GetConversationMessagesParams,
  GetConversationMessagesResult,
  ConversationAPISendMessageParams,
  ConversationAPIGetMessagesParams,
  // From interfaces/device.ts
  RegisterDeviceType,
  RegisterDeviceParams,
  UnregisterDeviceParams,
  RegisterDeviceResponse,
  RegisterDeviceResult,
  // From interfaces/incomingCallManager.ts
  IncomingInviteSource,
  IncomingInvite,
  IncomingInviteWithSource,
  IncomingCallNotification,
  IncomingCallHandler,
  IncomingCallHandlers,
  // From interfaces/wsClient.ts
  OnlineParams,
  HandlePushNotificationParams,
  HandlePushNotificationResult,
  DialParams,
  ReattachParams,
  // From interfaces/index.ts
  SignalWireClient,
  SignalWireContract,
  SignalWireClientParams,
  GetSubscriberInfoResponse,
  GetSubscriberInfoResult,
  PaginatedResponse,
  PaginatedResult,
} from './unified'

/**
 * The Call namespace contains the classes and functions that you need to
 * create a unified communication application that includes Audio/Video calling
 * with Chat/Messaging capabilties.
 */
export * as Call from './unified'
export { SignalWire } from './unified'
export * from './unified'

export { RoomSessionScreenShare } from './RoomSessionScreenShare'
export { RoomSessionDevice } from './RoomSessionDevice'

/**
 * The WebRTC namespace includes functions that give you access to the input and
 * output media devices available on the user's machine. For example, you can
 * use these functions to request permission and get access to the media stream
 * from a webcam, from a microphone, or from a screen sharing.
 */
export * as WebRTC from './webrtc'

/**
 * Build Video Element
 */
export { buildVideoElement } from './buildVideoElement'
export { LocalVideoOverlay, OverlayMap, UserOverlay } from './VideoOverlays'
