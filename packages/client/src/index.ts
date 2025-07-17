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
import { A } from 'ts-toolbelt'
import { ShallowCompute } from './utils/typeUtils'
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
export type BaseComponentOptions = A.Compute<CoreBaseComponentOptions, 'deep'>
export type BaseConnectionState = A.Compute<CoreBaseConnectionState, 'deep'>
export type ClientEvents = A.Compute<CoreClientEvents, 'deep'>
export type EmitterContract<EventTypes extends EventEmitter.ValidEventTypes> = ShallowCompute<CoreEmitterContract<EventTypes>>
export type RTCTrackEventName = A.Compute<CoreRTCTrackEventName, 'deep'>
export type UserOptions = A.Compute<CoreUserOptions, 'deep'>
export type SessionStatus = A.Compute<CoreSessionStatus, 'deep'>
export type SessionEvents = A.Compute<CoreSessionEvents, 'deep'>
export type VideoLayout = A.Compute<CoreVideoLayout, 'deep'>
export type InternalVideoLayout = A.Compute<CoreInternalVideoLayout, 'deep'>
export type VideoPosition = A.Compute<CoreVideoPosition, 'deep'>
export type VideoPositions = A.Compute<CoreVideoPositions, 'deep'>

/**
 * Call Fabric types
 */
export type CallUpdatedEventParams = A.Compute<CoreCallUpdatedEventParams, 'deep'>
export type CallLeftEventParams = A.Compute<CoreCallLeftEventParams, 'deep'>
export type CallStateEventParams = A.Compute<CoreCallStateEventParams, 'deep'>
export type CallPlayEventParams = A.Compute<CoreCallPlayEventParams, 'deep'>
export type CallConnectEventParams = A.Compute<CoreCallConnectEventParams, 'deep'>
export type CallRoomEventParams = A.Compute<CoreCallRoomEventParams, 'deep'>
export type CallLayoutChangedEventParams = A.Compute<FabricCallLayoutChangedEventParams, 'deep'>
export type CallMemberJoinedEventParams = A.Compute<FabricCallMemberJoinedEventParams, 'deep'>
export type CallMemberUpdatedEventParams = A.Compute<FabricCallMemberUpdatedEventParams, 'deep'>
export type CallMemberLeftEventParams = A.Compute<FabricCallMemberLeftEventParams, 'deep'>
export type CallMemberTalkingEventParams = A.Compute<FabricCallMemberTalkingEventParams, 'deep'>
export type CallMemberEventParams = A.Compute<FabricCallMemberEventParams, 'deep'>
export type CallMemberEntity = A.Compute<FabricCallMemberEntity, 'deep'>
export type InternalCallMemberEntity = A.Compute<FabricInternalCallMemberEntity, 'deep'>
export type ConversationMessageEventName = A.Compute<CoreConversationMessageEventName, 'deep'>
export type ConversationMessageEvent = A.Compute<CoreConversationMessageEvent, 'deep'>
export type ConversationEventParams = A.Compute<CoreConversationEventParams, 'deep'>
export type ConversationEvent = A.Compute<CoreConversationEvent, 'deep'>
export type CallEventParams = A.Compute<FabricCallRoomEventParams, 'deep'>
export type SetAudioFlagsParams = A.Compute<CoreSetAudioFlagsParams, 'deep'>

// WebRTC types
export type BaseConnectionOptions = A.Compute<WebRTCBaseConnectionOptions, 'deep'>
export type ConnectionOptions = A.Compute<WebRTCConnectionOptions, 'deep'>
export type MicrophoneAnalyzer = A.Compute<WebRTCMicrophoneAnalyzer, 'deep'>

// Local interface types
export type CallJoinedEventParams = A.Compute<LocalCallJoinedEventParams, 'deep'>
export type RoomSessionObjectEventsHandlerMap = A.Compute<LocalRoomSessionObjectEventsHandlerMap, 'deep'>
export type RoomSessionObjectEvents = A.Compute<LocalRoomSessionObjectEvents, 'deep'>
export type RoomEventNames = A.Compute<LocalRoomEventNames, 'deep'>
export type StartScreenShareOptions = A.Compute<LocalStartScreenShareOptions, 'deep'>

// Export fabric types
// Address types
export type ResourceType = A.Compute<FabricResourceType, 'deep'>
export type GetAddressResponse = A.Compute<FabricGetAddressResponse, 'deep'>
export type Address = A.Compute<FabricAddress, 'deep'>
export type GetAddressesParams = A.Compute<FabricGetAddressesParams, 'deep'>
export type GetAddressByIdParams = A.Compute<FabricGetAddressByIdParams, 'deep'>
export type GetAddressByNameParams = A.Compute<FabricGetAddressByNameParams, 'deep'>
export type GetAddressParams = A.Compute<FabricGetAddressParams, 'deep'>
export type GetAddressResult = A.Compute<FabricGetAddressResult, 'deep'>
export type GetAddressesResponse = A.Compute<FabricGetAddressesResponse, 'deep'>
export type GetAddressesResult = A.Compute<FabricGetAddressesResult, 'deep'>

// Capabilities types
export type CapabilityOnOffStateContract = A.Compute<FabricCapabilityOnOffStateContract, 'deep'>
export type MemberCapabilityContract = ShallowCompute<FabricMemberCapabilityContract>
export type CallCapabilitiesContract = ShallowCompute<FabricCallCapabilitiesContract>

// Conversation types
export type ConversationContract = ShallowCompute<FabricConversationContract>
export type SendConversationMessageParams = A.Compute<FabricSendConversationMessageParams, 'deep'>
export type SendConversationMessageResponse = A.Compute<FabricSendConversationMessageResponse, 'deep'>
export type SendConversationMessageResult = A.Compute<FabricSendConversationMessageResult, 'deep'>
export type GetConversationsParams = A.Compute<FabricGetConversationsParams, 'deep'>
export type ConversationResponse = A.Compute<FabricConversationResponse, 'deep'>
export type GetConversationsResponse = A.Compute<FabricGetConversationsResponse, 'deep'>
export type GetConversationsResult = A.Compute<FabricGetConversationsResult, 'deep'>
export type ConversationSubscribeCallback = ShallowCompute<FabricConversationSubscribeCallback>
export type ConversationSubscribeResult = A.Compute<FabricConversationSubscribeResult, 'deep'>
export type ConversationChatMessagesSubscribeParams = A.Compute<FabricConversationChatMessagesSubscribeParams, 'deep'>
export type ConversationChatMessagesSubscribeResult = A.Compute<FabricConversationChatMessagesSubscribeResult, 'deep'>
export type JoinConversationParams = A.Compute<FabricJoinConversationParams, 'deep'>
export type JoinConversationResponse = A.Compute<FabricJoinConversationResponse, 'deep'>
export type JoinConversationResult = A.Compute<FabricJoinConversationResult, 'deep'>
export type GetMessagesParams = A.Compute<FabricGetMessagesParams, 'deep'>
export type ConversationMessage = A.Compute<FabricConversationMessage, 'deep'>
export type GetMessagesResult = A.Compute<FabricGetMessagesResult, 'deep'>
export type ConversationChatMessage = A.Compute<FabricConversationChatMessage, 'deep'>
export type GetConversationChatMessageParams = A.Compute<FabricGetConversationChatMessageParams, 'deep'>
export type GetConversationChatMessageResult = A.Compute<FabricGetConversationChatMessageResult, 'deep'>
export type GetConversationMessagesResponse = A.Compute<FabricGetConversationMessagesResponse, 'deep'>
export type GetConversationMessagesParams = A.Compute<FabricGetConversationMessagesParams, 'deep'>
export type GetConversationMessagesResult = A.Compute<FabricGetConversationMessagesResult, 'deep'>
export type ConversationAPISendMessageParams = A.Compute<FabricConversationAPISendMessageParams, 'deep'>
export type ConversationAPIGetMessagesParams = A.Compute<FabricConversationAPIGetMessagesParams, 'deep'>

// Device types
export type RegisterDeviceType = A.Compute<FabricRegisterDeviceType, 'deep'>
export type RegisterDeviceParams = A.Compute<FabricRegisterDeviceParams, 'deep'>
export type UnregisterDeviceParams = A.Compute<FabricUnregisterDeviceParams, 'deep'>
export type RegisterDeviceResponse = A.Compute<FabricRegisterDeviceResponse, 'deep'>
export type RegisterDeviceResult = A.Compute<FabricRegisterDeviceResult, 'deep'>

// IncomingCallManager types
export type IncomingInviteSource = A.Compute<FabricIncomingInviteSource, 'deep'>
export type IncomingInvite = A.Compute<FabricIncomingInvite, 'deep'>
export type IncomingInviteWithSource = A.Compute<FabricIncomingInviteWithSource, 'deep'>
export type IncomingCallNotification = A.Compute<FabricIncomingCallNotification, 'deep'>
export type IncomingCallHandler = ShallowCompute<FabricIncomingCallHandler>
export type IncomingCallHandlers = ShallowCompute<FabricIncomingCallHandlers>

// WSClient types
export type OnlineParams = A.Compute<FabricOnlineParams, 'deep'>
export type HandlePushNotificationParams = A.Compute<FabricHandlePushNotificationParams, 'deep'>
export type HandlePushNotificationResult = A.Compute<FabricHandlePushNotificationResult, 'deep'>
export type DialParams = A.Compute<FabricDialParams, 'deep'>
export type ReattachParams = A.Compute<FabricReattachParams, 'deep'>

// Main interface types
export type SignalWireClient = ShallowCompute<FabricSignalWireClient>
export type SignalWireContract = ShallowCompute<FabricSignalWireContract>
export type SignalWireClientParams = A.Compute<FabricSignalWireClientParams, 'deep'>
export type GetSubscriberInfoResponse = A.Compute<FabricGetSubscriberInfoResponse, 'deep'>
export type GetSubscriberInfoResult = A.Compute<FabricGetSubscriberInfoResult, 'deep'>
export type PaginatedResponse<T> = ShallowCompute<FabricPaginatedResponse<T>>
export type PaginatedResult<T> = ShallowCompute<FabricPaginatedResult<T>>

/**
 * Build Video Element
 */
export { buildVideoElement } from './buildVideoElement'
export { LocalVideoOverlay, OverlayMap, UserOverlay } from './VideoOverlays'