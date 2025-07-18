/**
 * Welcome to the technical documentation for the Unified Client JavaScript SDK(a.k.a Fabric SDK).
 * @module
 */

import {
  BaseComponentOptions as CoreBaseComponentOptions,
  BaseConnectionState as CoreBaseConnectionState,
  ClientEvents as CoreClientEvents,
  EmitterContract as CoreEmitterContract,
  RTCTrackEventName as CoreRTCTrackEventName,
  UserOptions as CoreUserOptions,
  SessionStatus as CoreSessionStatus,
  SessionEvents as CoreSessionEvents,
  VideoLayout as CoreVideoLayout,
  InternalVideoLayout as CoreInternalVideoLayout,
  VideoPosition as CoreVideoPosition,
  VideoPositions as CoreVideoPositions,
  CallUpdatedEventParams as CoreCallUpdatedEventParams,
  CallLeftEventParams as CoreCallLeftEventParams,
  CallStateEventParams as CoreCallStateEventParams,
  CallPlayEventParams as CoreCallPlayEventParams,
  CallConnectEventParams as CoreCallConnectEventParams,
  CallRoomEventParams as CoreCallRoomEventParams,
  ConversationMessageEventName as CoreConversationMessageEventName,
  ConversationMessageEvent as CoreConversationMessageEvent,
  ConversationEventParams as CoreConversationEventParams,
  ConversationEvent as CoreConversationEvent,
  EventEmitter,
  SetAudioFlagsParams as CoreSetAudioFlagsParams,
} from '@signalwire/core'
import { ShallowCompute, DeepCompute } from './utils/typeUtils'
import {
  // FIXME: Importing from the core package
  CallRoomEventParams as FabricCallRoomEventParams,
  CallLayoutChangedEventParams as FabricCallLayoutChangedEventParams,
  CallMemberJoinedEventParams as FabricCallMemberJoinedEventParams,
  CallMemberUpdatedEventParams as FabricCallMemberUpdatedEventParams,
  CallMemberLeftEventParams as FabricCallMemberLeftEventParams,
  CallMemberTalkingEventParams as FabricCallMemberTalkingEventParams,
  CallMemberEventParams as FabricCallMemberEventParams,
  CallMemberEntity as FabricCallMemberEntity,
  InternalCallMemberEntity as FabricInternalCallMemberEntity,
} from './utils/interfaces/fabric'
import {
  BaseConnectionOptions as WebRTCBaseConnectionOptions,
  ConnectionOptions as WebRTCConnectionOptions,
  MicrophoneAnalyzer as WebRTCMicrophoneAnalyzer,
} from '@signalwire/webrtc'
import {
  CallJoinedEventParams as LocalCallJoinedEventParams,
  RoomSessionObjectEventsHandlerMap as LocalRoomSessionObjectEventsHandlerMap,
  RoomSessionObjectEvents as LocalRoomSessionObjectEvents,
  RoomEventNames as LocalRoomEventNames,
  StartScreenShareOptions as LocalStartScreenShareOptions,
} from './utils/interfaces'
import {
  // From interfaces/address.ts
  ResourceType as FabricResourceType,
  GetAddressResponse as FabricGetAddressResponse,
  Address as FabricAddress,
  GetAddressesParams as FabricGetAddressesParams,
  GetAddressByIdParams as FabricGetAddressByIdParams,
  GetAddressByNameParams as FabricGetAddressByNameParams,
  GetAddressParams as FabricGetAddressParams,
  GetAddressResult as FabricGetAddressResult,
  GetAddressesResponse as FabricGetAddressesResponse,
  GetAddressesResult as FabricGetAddressesResult,
  // From interfaces/capabilities.ts
  CapabilityOnOffStateContract as FabricCapabilityOnOffStateContract,
  MemberCapabilityContract as FabricMemberCapabilityContract,
  CallCapabilitiesContract as FabricCallCapabilitiesContract,
  // From interfaces/conversation.ts
  ConversationContract as FabricConversationContract,
  SendConversationMessageParams as FabricSendConversationMessageParams,
  SendConversationMessageResponse as FabricSendConversationMessageResponse,
  SendConversationMessageResult as FabricSendConversationMessageResult,
  GetConversationsParams as FabricGetConversationsParams,
  ConversationResponse as FabricConversationResponse,
  GetConversationsResponse as FabricGetConversationsResponse,
  GetConversationsResult as FabricGetConversationsResult,
  ConversationSubscribeCallback as FabricConversationSubscribeCallback,
  ConversationSubscribeResult as FabricConversationSubscribeResult,
  ConversationChatMessagesSubscribeParams as FabricConversationChatMessagesSubscribeParams,
  ConversationChatMessagesSubscribeResult as FabricConversationChatMessagesSubscribeResult,
  JoinConversationParams as FabricJoinConversationParams,
  JoinConversationResponse as FabricJoinConversationResponse,
  JoinConversationResult as FabricJoinConversationResult,
  GetMessagesParams as FabricGetMessagesParams,
  ConversationMessage as FabricConversationMessage,
  GetMessagesResult as FabricGetMessagesResult,
  ConversationChatMessage as FabricConversationChatMessage,
  GetConversationChatMessageParams as FabricGetConversationChatMessageParams,
  GetConversationChatMessageResult as FabricGetConversationChatMessageResult,
  GetConversationMessagesResponse as FabricGetConversationMessagesResponse,
  GetConversationMessagesParams as FabricGetConversationMessagesParams,
  GetConversationMessagesResult as FabricGetConversationMessagesResult,
  ConversationAPISendMessageParams as FabricConversationAPISendMessageParams,
  ConversationAPIGetMessagesParams as FabricConversationAPIGetMessagesParams,
  // From interfaces/device.ts
  RegisterDeviceType as FabricRegisterDeviceType,
  RegisterDeviceParams as FabricRegisterDeviceParams,
  UnregisterDeviceParams as FabricUnregisterDeviceParams,
  RegisterDeviceResponse as FabricRegisterDeviceResponse,
  RegisterDeviceResult as FabricRegisterDeviceResult,
  // From interfaces/incomingCallManager.ts
  IncomingInviteSource as FabricIncomingInviteSource,
  IncomingInvite as FabricIncomingInvite,
  IncomingInviteWithSource as FabricIncomingInviteWithSource,
  IncomingCallNotification as FabricIncomingCallNotification,
  IncomingCallHandler as FabricIncomingCallHandler,
  IncomingCallHandlers as FabricIncomingCallHandlers,
  // From interfaces/wsClient.ts
  OnlineParams as FabricOnlineParams,
  HandlePushNotificationParams as FabricHandlePushNotificationParams,
  HandlePushNotificationResult as FabricHandlePushNotificationResult,
  DialParams as FabricDialParams,
  ReattachParams as FabricReattachParams,
  // From interfaces/index.ts
  SignalWireClient as FabricSignalWireClient,
  SignalWireContract as FabricSignalWireContract,
  SignalWireClientParams as FabricSignalWireClientParams,
  GetSubscriberInfoResponse as FabricGetSubscriberInfoResponse,
  GetSubscriberInfoResult as FabricGetSubscriberInfoResult,
  PaginatedResponse as FabricPaginatedResponse,
  PaginatedResult as FabricPaginatedResult,
} from './fabric'

/**
 * The Fabric namespace contains the classes and functions that you need to
 * create a unified communication application that includes Audio/Video calling
 * with Chat/Messaging capabilties.
 */
export * as Fabric from './fabric'
export { SignalWire } from './fabric'
export * from './fabric'

export { RoomSessionScreenShare } from './RoomSessionScreenShare'
export { RoomSessionDevice } from './RoomSessionDevice'

/**
 * The WebRTC namespace includes functions that give you access to the input and
 * output media devices available on the user's machine. For example, you can
 * use these functions to request permission and get access to the media stream
 * from a webcam, from a microphone, or from a screen sharing.
 */
export * as WebRTC from './webrtc'

// Core types exports
export type BaseComponentOptions = DeepCompute<CoreBaseComponentOptions>
export type BaseConnectionState = DeepCompute<CoreBaseConnectionState>
export type ClientEvents = DeepCompute<CoreClientEvents>
export type EmitterContract<EventTypes extends EventEmitter.ValidEventTypes> = ShallowCompute<CoreEmitterContract<EventTypes>>
export type RTCTrackEventName = DeepCompute<CoreRTCTrackEventName>
export type UserOptions = DeepCompute<CoreUserOptions>
export type SessionStatus = DeepCompute<CoreSessionStatus>
export type SessionEvents = DeepCompute<CoreSessionEvents>
export type VideoLayout = DeepCompute<CoreVideoLayout>
export type InternalVideoLayout = DeepCompute<CoreInternalVideoLayout>
export type VideoPosition = DeepCompute<CoreVideoPosition>
export type VideoPositions = DeepCompute<CoreVideoPositions>

/**
 * Call Fabric types
 */
export type CallUpdatedEventParams = DeepCompute<CoreCallUpdatedEventParams>
export type CallLeftEventParams = DeepCompute<CoreCallLeftEventParams>
export type CallStateEventParams = DeepCompute<CoreCallStateEventParams>
export type CallPlayEventParams = DeepCompute<CoreCallPlayEventParams>
export type CallConnectEventParams = DeepCompute<CoreCallConnectEventParams>
export type CallRoomEventParams = DeepCompute<CoreCallRoomEventParams>
export type CallLayoutChangedEventParams = DeepCompute<FabricCallLayoutChangedEventParams>
export type CallMemberJoinedEventParams = DeepCompute<FabricCallMemberJoinedEventParams>
export type CallMemberUpdatedEventParams = DeepCompute<FabricCallMemberUpdatedEventParams>
export type CallMemberLeftEventParams = DeepCompute<FabricCallMemberLeftEventParams>
export type CallMemberTalkingEventParams = DeepCompute<FabricCallMemberTalkingEventParams>
export type CallMemberEventParams = DeepCompute<FabricCallMemberEventParams>
export type CallMemberEntity = DeepCompute<FabricCallMemberEntity>
export type InternalCallMemberEntity = DeepCompute<FabricInternalCallMemberEntity>
export type ConversationMessageEventName = DeepCompute<CoreConversationMessageEventName>
export type ConversationMessageEvent = DeepCompute<CoreConversationMessageEvent>
export type ConversationEventParams = DeepCompute<CoreConversationEventParams>
export type ConversationEvent = DeepCompute<CoreConversationEvent>
export type CallEventParams = DeepCompute<FabricCallRoomEventParams>
export type SetAudioFlagsParams = DeepCompute<CoreSetAudioFlagsParams>

// WebRTC types
export type BaseConnectionOptions = DeepCompute<WebRTCBaseConnectionOptions>
export type ConnectionOptions = DeepCompute<WebRTCConnectionOptions>
export type MicrophoneAnalyzer = DeepCompute<WebRTCMicrophoneAnalyzer>

// Local interface types
export type CallJoinedEventParams = DeepCompute<LocalCallJoinedEventParams>
export type RoomSessionObjectEventsHandlerMap = DeepCompute<LocalRoomSessionObjectEventsHandlerMap>
export type RoomSessionObjectEvents = DeepCompute<LocalRoomSessionObjectEvents>
export type RoomEventNames = DeepCompute<LocalRoomEventNames>
export type StartScreenShareOptions = DeepCompute<LocalStartScreenShareOptions>

// Export fabric types
// Address types
export type ResourceType = DeepCompute<FabricResourceType>
export type GetAddressResponse = DeepCompute<FabricGetAddressResponse>
export type Address = DeepCompute<FabricAddress>
export type GetAddressesParams = DeepCompute<FabricGetAddressesParams>
export type GetAddressByIdParams = DeepCompute<FabricGetAddressByIdParams>
export type GetAddressByNameParams = DeepCompute<FabricGetAddressByNameParams>
export type GetAddressParams = DeepCompute<FabricGetAddressParams>
export type GetAddressResult = DeepCompute<FabricGetAddressResult>
export type GetAddressesResponse = DeepCompute<FabricGetAddressesResponse>
export type GetAddressesResult = DeepCompute<FabricGetAddressesResult>

// Capabilities types
export type CapabilityOnOffStateContract = DeepCompute<FabricCapabilityOnOffStateContract>
export type MemberCapabilityContract = ShallowCompute<FabricMemberCapabilityContract>
export type CallCapabilitiesContract = ShallowCompute<FabricCallCapabilitiesContract>

// Conversation types
export type ConversationContract = ShallowCompute<FabricConversationContract>
export type SendConversationMessageParams = DeepCompute<FabricSendConversationMessageParams>
export type SendConversationMessageResponse = DeepCompute<FabricSendConversationMessageResponse>
export type SendConversationMessageResult = DeepCompute<FabricSendConversationMessageResult>
export type GetConversationsParams = DeepCompute<FabricGetConversationsParams>
export type ConversationResponse = DeepCompute<FabricConversationResponse>
export type GetConversationsResponse = DeepCompute<FabricGetConversationsResponse>
export type GetConversationsResult = DeepCompute<FabricGetConversationsResult>
export type ConversationSubscribeCallback = ShallowCompute<FabricConversationSubscribeCallback>
export type ConversationSubscribeResult = DeepCompute<FabricConversationSubscribeResult>
export type ConversationChatMessagesSubscribeParams = DeepCompute<FabricConversationChatMessagesSubscribeParams>
export type ConversationChatMessagesSubscribeResult = DeepCompute<FabricConversationChatMessagesSubscribeResult>
export type JoinConversationParams = DeepCompute<FabricJoinConversationParams>
export type JoinConversationResponse = DeepCompute<FabricJoinConversationResponse>
export type JoinConversationResult = DeepCompute<FabricJoinConversationResult>
export type GetMessagesParams = DeepCompute<FabricGetMessagesParams>
export type ConversationMessage = DeepCompute<FabricConversationMessage>
export type GetMessagesResult = DeepCompute<FabricGetMessagesResult>
export type ConversationChatMessage = DeepCompute<FabricConversationChatMessage>
export type GetConversationChatMessageParams = DeepCompute<FabricGetConversationChatMessageParams>
export type GetConversationChatMessageResult = DeepCompute<FabricGetConversationChatMessageResult>
export type GetConversationMessagesResponse = DeepCompute<FabricGetConversationMessagesResponse>
export type GetConversationMessagesParams = DeepCompute<FabricGetConversationMessagesParams>
export type GetConversationMessagesResult = DeepCompute<FabricGetConversationMessagesResult>
export type ConversationAPISendMessageParams = DeepCompute<FabricConversationAPISendMessageParams>
export type ConversationAPIGetMessagesParams = DeepCompute<FabricConversationAPIGetMessagesParams>

// Device types
export type RegisterDeviceType = DeepCompute<FabricRegisterDeviceType>
export type RegisterDeviceParams = DeepCompute<FabricRegisterDeviceParams>
export type UnregisterDeviceParams = DeepCompute<FabricUnregisterDeviceParams>
export type RegisterDeviceResponse = DeepCompute<FabricRegisterDeviceResponse>
export type RegisterDeviceResult = DeepCompute<FabricRegisterDeviceResult>

// IncomingCallManager types
export type IncomingInviteSource = DeepCompute<FabricIncomingInviteSource>
export type IncomingInvite = DeepCompute<FabricIncomingInvite>
export type IncomingInviteWithSource = DeepCompute<FabricIncomingInviteWithSource>
export type IncomingCallNotification = DeepCompute<FabricIncomingCallNotification>
export type IncomingCallHandler = ShallowCompute<FabricIncomingCallHandler>
export type IncomingCallHandlers = ShallowCompute<FabricIncomingCallHandlers>

// WSClient types
export type OnlineParams = DeepCompute<FabricOnlineParams>
export type HandlePushNotificationParams = DeepCompute<FabricHandlePushNotificationParams>
export type HandlePushNotificationResult = DeepCompute<FabricHandlePushNotificationResult>
export type DialParams = DeepCompute<FabricDialParams>
export type ReattachParams = DeepCompute<FabricReattachParams>

// Main interface types
export type SignalWireClient = ShallowCompute<FabricSignalWireClient>
export type SignalWireContract = ShallowCompute<FabricSignalWireContract>
export type SignalWireClientParams = DeepCompute<FabricSignalWireClientParams>
export type GetSubscriberInfoResponse = DeepCompute<FabricGetSubscriberInfoResponse>
export type GetSubscriberInfoResult = DeepCompute<FabricGetSubscriberInfoResult>
export type PaginatedResponse<T> = ShallowCompute<FabricPaginatedResponse<T>>
export type PaginatedResult<T> = ShallowCompute<FabricPaginatedResult<T>>

/**
 * Build Video Element
 */
export { buildVideoElement } from './buildVideoElement'
export { LocalVideoOverlay, OverlayMap, UserOverlay } from './VideoOverlays'