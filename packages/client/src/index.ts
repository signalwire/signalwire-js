/**
 * Welcome to the technical documentation for the Unified Client JavaScript SDK(a.k.a Fabric SDK).
 * @module
 */

import {
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
  CallRoomEventParams,
  ConversationMessageEventName,
  ConversationMessageEvent,
  ConversationEventParams,
  ConversationEvent,
  EventEmitter,
  SetAudioFlagsParams,
} from '@signalwire/core'
import { A } from 'ts-toolbelt'
import { ShallowCompute } from './utils/typeUtils'
import {
  // FIXME: Importing from the core package
  CallRoomEventParams as FabricCallRoomEventParams,
  CallLayoutChangedEventParams,
  CallMemberJoinedEventParams,
  CallMemberUpdatedEventParams,
  CallMemberLeftEventParams,
  CallMemberTalkingEventParams,
  CallMemberEventParams,
  CallMemberEntity,
  InternalCallMemberEntity,
} from './utils/interfaces/fabric'
import {
  BaseConnectionOptions,
  ConnectionOptions,
  MicrophoneAnalyzer,
} from '@signalwire/webrtc'
import {
  CallJoinedEventParams,
  RoomSessionObjectEventsHandlerMap,
  RoomSessionObjectEvents,
  RoomEventNames,
  StartScreenShareOptions,
} from './utils/interfaces'
import {
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

type ExternalFabricRoomEventParams = A.Compute<FabricCallRoomEventParams, 'deep'>
type ExternalBaseComponentOptions = A.Compute<BaseComponentOptions, 'deep'>
type ExternalBaseConnectionState = A.Compute<BaseConnectionState, 'deep'>
type ExternalClientEvents = A.Compute<ClientEvents, 'deep'>
type ExternalEmitterContract<EventTypes extends EventEmitter.ValidEventTypes> =
  ShallowCompute<EmitterContract<EventTypes>>
type ExternalRTCTrackEventName = A.Compute<RTCTrackEventName, 'deep'>
type ExternalUserOptions = A.Compute<UserOptions, 'deep'>
type ExternalSessionStatus = A.Compute<SessionStatus, 'deep'>
type ExternalSessionEvents = A.Compute<SessionEvents, 'deep'>
type ExternalVideoLayout = A.Compute<VideoLayout, 'deep'>
type ExternalInternalVideoLayout = A.Compute<InternalVideoLayout, 'deep'>
type ExternalVideoPosition = A.Compute<VideoPosition, 'deep'>
type ExternalVideoPositions = A.Compute<VideoPositions, 'deep'>
type ExternalCallUpdatedEventParams = A.Compute<CallUpdatedEventParams, 'deep'>
type ExternalCallLeftEventParams = A.Compute<CallLeftEventParams, 'deep'>
type ExternalCallStateEventParams = A.Compute<CallStateEventParams, 'deep'>
type ExternalCallPlayEventParams = A.Compute<CallPlayEventParams, 'deep'>
type ExternalCallConnectEventParams = A.Compute<CallConnectEventParams, 'deep'>
type ExternalCallRoomEventParams = A.Compute<CallRoomEventParams, 'deep'>
type ExternalFabricLayoutChangedEventParams =
  A.Compute<CallLayoutChangedEventParams, 'deep'>
type ExternalFabricMemberJoinedEventParams =
  A.Compute<CallMemberJoinedEventParams, 'deep'>
type ExternalFabricMemberUpdatedEventParams =
  A.Compute<CallMemberUpdatedEventParams, 'deep'>
type ExternalFabricMemberLeftEventParams = A.Compute<CallMemberLeftEventParams, 'deep'>
type ExternalFabricMemberTalkingEventParams =
  A.Compute<CallMemberTalkingEventParams, 'deep'>
type ExternalFabricMemberEventParams = A.Compute<CallMemberEventParams, 'deep'>
type ExternalFabricMemberEntity = A.Compute<CallMemberEntity, 'deep'>
type ExternalInternalFabricMemberEntity = A.Compute<InternalCallMemberEntity, 'deep'>
type ExternalConversationMessageEventName =
  A.Compute<ConversationMessageEventName, 'deep'>
type ExternalConversationMessageEvent = A.Compute<ConversationMessageEvent, 'deep'>
type ExternalConversationEventParams = A.Compute<ConversationEventParams, 'deep'>
type ExternalConversationEvent = A.Compute<ConversationEvent, 'deep'>
type ExternalSetAudioFlagsParams = A.Compute<SetAudioFlagsParams, 'deep'>

// WebRTC types
type ExternalBaseConnectionOptions = A.Compute<BaseConnectionOptions, 'deep'>
type ExternalConnectionOptions = A.Compute<ConnectionOptions, 'deep'>
type ExternalMicrophoneAnalyzer = A.Compute<MicrophoneAnalyzer, 'deep'>

// Local interface types
type ExternalCallJoinedEventParams = A.Compute<CallJoinedEventParams, 'deep'>
type ExternalRoomSessionObjectEventsHandlerMap =
  A.Compute<RoomSessionObjectEventsHandlerMap, 'deep'>
type ExternalRoomSessionObjectEvents = A.Compute<RoomSessionObjectEvents, 'deep'>
type ExternalRoomEventNames = A.Compute<RoomEventNames, 'deep'>
type ExternalStartScreenShareOptions = A.Compute<StartScreenShareOptions, 'deep'>

// Fabric types - Address
type ExternalResourceType = A.Compute<ResourceType, 'deep'>
type ExternalGetAddressResponse = A.Compute<GetAddressResponse, 'deep'>
type ExternalAddress = A.Compute<Address, 'deep'>
type ExternalGetAddressesParams = A.Compute<GetAddressesParams, 'deep'>
type ExternalGetAddressByIdParams = A.Compute<GetAddressByIdParams, 'deep'>
type ExternalGetAddressByNameParams = A.Compute<GetAddressByNameParams, 'deep'>
type ExternalGetAddressParams = A.Compute<GetAddressParams, 'deep'>
type ExternalGetAddressResult = A.Compute<GetAddressResult, 'deep'>
type ExternalGetAddressesResponse = A.Compute<GetAddressesResponse, 'deep'>
type ExternalGetAddressesResult = A.Compute<GetAddressesResult, 'deep'>

// Fabric types - Capabilities
type ExternalCapabilityOnOffStateContract =
  A.Compute<CapabilityOnOffStateContract, 'deep'>
type ExternalMemberCapabilityContract = ShallowCompute<MemberCapabilityContract>
type ExternalCallCapabilitiesContract = ShallowCompute<CallCapabilitiesContract>

// Fabric types - Conversation
type ExternalConversationContract = ShallowCompute<ConversationContract>
type ExternalSendConversationMessageParams =
  A.Compute<SendConversationMessageParams, 'deep'>
type ExternalSendConversationMessageResponse =
  A.Compute<SendConversationMessageResponse, 'deep'>
type ExternalSendConversationMessageResult =
  A.Compute<SendConversationMessageResult, 'deep'>
type ExternalGetConversationsParams = A.Compute<GetConversationsParams, 'deep'>
type ExternalConversationResponse = A.Compute<ConversationResponse, 'deep'>
type ExternalGetConversationsResponse = A.Compute<GetConversationsResponse, 'deep'>
type ExternalGetConversationsResult = A.Compute<GetConversationsResult, 'deep'>
type ExternalConversationSubscribeCallback =
  ShallowCompute<ConversationSubscribeCallback>
type ExternalConversationSubscribeResult = A.Compute<ConversationSubscribeResult, 'deep'>
type ExternalConversationChatMessagesSubscribeParams =
  A.Compute<ConversationChatMessagesSubscribeParams, 'deep'>
type ExternalConversationChatMessagesSubscribeResult =
  A.Compute<ConversationChatMessagesSubscribeResult, 'deep'>
type ExternalJoinConversationParams = A.Compute<JoinConversationParams, 'deep'>
type ExternalJoinConversationResponse = A.Compute<JoinConversationResponse, 'deep'>
type ExternalJoinConversationResult = A.Compute<JoinConversationResult, 'deep'>
type ExternalGetMessagesParams = A.Compute<GetMessagesParams, 'deep'>
type ExternalConversationMessage = A.Compute<ConversationMessage, 'deep'>
type ExternalGetMessagesResult = A.Compute<GetMessagesResult, 'deep'>
type ExternalConversationChatMessage = A.Compute<ConversationChatMessage, 'deep'>
type ExternalGetConversationChatMessageParams =
  A.Compute<GetConversationChatMessageParams, 'deep'>
type ExternalGetConversationChatMessageResult =
  A.Compute<GetConversationChatMessageResult, 'deep'>
type ExternalGetConversationMessagesResponse =
  A.Compute<GetConversationMessagesResponse, 'deep'>
type ExternalGetConversationMessagesParams =
  A.Compute<GetConversationMessagesParams, 'deep'>
type ExternalGetConversationMessagesResult =
  A.Compute<GetConversationMessagesResult, 'deep'>
type ExternalConversationAPISendMessageParams =
  A.Compute<ConversationAPISendMessageParams, 'deep'>
type ExternalConversationAPIGetMessagesParams =
  A.Compute<ConversationAPIGetMessagesParams, 'deep'>

// Fabric types - Device
type ExternalRegisterDeviceType = A.Compute<RegisterDeviceType, 'deep'>
type ExternalRegisterDeviceParams = A.Compute<RegisterDeviceParams, 'deep'>
type ExternalUnregisterDeviceParams = A.Compute<UnregisterDeviceParams, 'deep'>
type ExternalRegisterDeviceResponse = A.Compute<RegisterDeviceResponse, 'deep'>
type ExternalRegisterDeviceResult = A.Compute<RegisterDeviceResult, 'deep'>

// Fabric types - IncomingCallManager
type ExternalIncomingInviteSource = A.Compute<IncomingInviteSource, 'deep'>
type ExternalIncomingInvite = A.Compute<IncomingInvite, 'deep'>
type ExternalIncomingInviteWithSource = A.Compute<IncomingInviteWithSource, 'deep'>
type ExternalIncomingCallNotification = A.Compute<IncomingCallNotification, 'deep'>
type ExternalIncomingCallHandler = ShallowCompute<IncomingCallHandler>
type ExternalIncomingCallHandlers = ShallowCompute<IncomingCallHandlers>

// Fabric types - WSClient
type ExternalOnlineParams = A.Compute<OnlineParams, 'deep'>
type ExternalHandlePushNotificationParams =
  A.Compute<HandlePushNotificationParams, 'deep'>
type ExternalHandlePushNotificationResult =
  A.Compute<HandlePushNotificationResult, 'deep'>
type ExternalDialParams = A.Compute<DialParams, 'deep'>
type ExternalReattachParams = A.Compute<ReattachParams, 'deep'>

// Fabric types - Main interfaces
type ExternalSignalWireClient = ShallowCompute<SignalWireClient>
type ExternalSignalWireContract = ShallowCompute<SignalWireContract>
type ExternalSignalWireClientParams = A.Compute<SignalWireClientParams, 'deep'>
type ExternalGetSubscriberInfoResponse = A.Compute<GetSubscriberInfoResponse, 'deep'>
type ExternalGetSubscriberInfoResult = A.Compute<GetSubscriberInfoResult, 'deep'>
type ExternalPaginatedResponse<T> = ShallowCompute<PaginatedResponse<T>>
type ExternalPaginatedResult<T> = ShallowCompute<PaginatedResult<T>>

export {
  ExternalBaseComponentOptions as BaseComponentOptions,
  ExternalBaseConnectionState as BaseConnectionState,
  ExternalClientEvents as ClientEvents,
  ExternalEmitterContract as EmitterContract,
  ExternalRTCTrackEventName as RTCTrackEventName,
  ExternalUserOptions as UserOptions,
  ExternalSessionStatus as SessionStatus,
  ExternalSessionEvents as SessionEvents,
  ExternalVideoLayout as VideoLayout,
  ExternalInternalVideoLayout as InternalVideoLayout,
  ExternalVideoPosition as VideoPosition,
  ExternalVideoPositions as VideoPositions,
  /**
   * Call Fabric types
   */
  ExternalCallUpdatedEventParams as CallUpdatedEventParams,
  ExternalCallLeftEventParams as CallLeftEventParams,
  ExternalCallStateEventParams as CallStateEventParams,
  ExternalCallPlayEventParams as CallPlayEventParams,
  ExternalCallConnectEventParams as CallConnectEventParams,
  ExternalCallRoomEventParams as CallRoomEventParams,
  ExternalFabricLayoutChangedEventParams as CallLayoutChangedEventParams,
  ExternalFabricMemberJoinedEventParams as CallMemberJoinedEventParams,
  ExternalFabricMemberUpdatedEventParams as CallMemberUpdatedEventParams,
  ExternalFabricMemberLeftEventParams as CallMemberLeftEventParams,
  ExternalFabricMemberTalkingEventParams as CallMemberTalkingEventParams,
  ExternalFabricMemberEventParams as CallMemberEventParams,
  ExternalFabricMemberEntity as CallMemberEntity,
  ExternalInternalFabricMemberEntity as InternalCallMemberEntity,
  ExternalConversationMessageEventName as ConversationMessageEventName,
  ExternalConversationMessageEvent as ConversationMessageEvent,
  ExternalConversationEventParams as ConversationEventParams,
  ExternalConversationEvent as ConversationEvent,
  ExternalFabricRoomEventParams as CallEventParams,
  ExternalSetAudioFlagsParams as SetAudioFlagsParams,
}

export {
  ExternalBaseConnectionOptions as BaseConnectionOptions,
  ExternalConnectionOptions as ConnectionOptions,
  ExternalMicrophoneAnalyzer as MicrophoneAnalyzer,
}

export {
  ExternalCallJoinedEventParams as CallJoinedEventParams,
  ExternalRoomSessionObjectEventsHandlerMap as RoomSessionObjectEventsHandlerMap,
  ExternalRoomSessionObjectEvents as RoomSessionObjectEvents,
  ExternalRoomEventNames as RoomEventNames,
  ExternalStartScreenShareOptions as StartScreenShareOptions,
}

// Export prettified fabric types
export {
  // Address types
  ExternalResourceType as ResourceType,
  ExternalGetAddressResponse as GetAddressResponse,
  ExternalAddress as Address,
  ExternalGetAddressesParams as GetAddressesParams,
  ExternalGetAddressByIdParams as GetAddressByIdParams,
  ExternalGetAddressByNameParams as GetAddressByNameParams,
  ExternalGetAddressParams as GetAddressParams,
  ExternalGetAddressResult as GetAddressResult,
  ExternalGetAddressesResponse as GetAddressesResponse,
  ExternalGetAddressesResult as GetAddressesResult,
  // Capabilities types
  ExternalCapabilityOnOffStateContract as CapabilityOnOffStateContract,
  ExternalMemberCapabilityContract as MemberCapabilityContract,
  ExternalCallCapabilitiesContract as CallCapabilitiesContract,
  // Conversation types
  ExternalConversationContract as ConversationContract,
  ExternalSendConversationMessageParams as SendConversationMessageParams,
  ExternalSendConversationMessageResponse as SendConversationMessageResponse,
  ExternalSendConversationMessageResult as SendConversationMessageResult,
  ExternalGetConversationsParams as GetConversationsParams,
  ExternalConversationResponse as ConversationResponse,
  ExternalGetConversationsResponse as GetConversationsResponse,
  ExternalGetConversationsResult as GetConversationsResult,
  ExternalConversationSubscribeCallback as ConversationSubscribeCallback,
  ExternalConversationSubscribeResult as ConversationSubscribeResult,
  ExternalConversationChatMessagesSubscribeParams as ConversationChatMessagesSubscribeParams,
  ExternalConversationChatMessagesSubscribeResult as ConversationChatMessagesSubscribeResult,
  ExternalJoinConversationParams as JoinConversationParams,
  ExternalJoinConversationResponse as JoinConversationResponse,
  ExternalJoinConversationResult as JoinConversationResult,
  ExternalGetMessagesParams as GetMessagesParams,
  ExternalConversationMessage as ConversationMessage,
  ExternalGetMessagesResult as GetMessagesResult,
  ExternalConversationChatMessage as ConversationChatMessage,
  ExternalGetConversationChatMessageParams as GetConversationChatMessageParams,
  ExternalGetConversationChatMessageResult as GetConversationChatMessageResult,
  ExternalGetConversationMessagesResponse as GetConversationMessagesResponse,
  ExternalGetConversationMessagesParams as GetConversationMessagesParams,
  ExternalGetConversationMessagesResult as GetConversationMessagesResult,
  ExternalConversationAPISendMessageParams as ConversationAPISendMessageParams,
  ExternalConversationAPIGetMessagesParams as ConversationAPIGetMessagesParams,
  // Device types
  ExternalRegisterDeviceType as RegisterDeviceType,
  ExternalRegisterDeviceParams as RegisterDeviceParams,
  ExternalUnregisterDeviceParams as UnregisterDeviceParams,
  ExternalRegisterDeviceResponse as RegisterDeviceResponse,
  ExternalRegisterDeviceResult as RegisterDeviceResult,
  // IncomingCallManager types
  ExternalIncomingInviteSource as IncomingInviteSource,
  ExternalIncomingInvite as IncomingInvite,
  ExternalIncomingInviteWithSource as IncomingInviteWithSource,
  ExternalIncomingCallNotification as IncomingCallNotification,
  ExternalIncomingCallHandler as IncomingCallHandler,
  ExternalIncomingCallHandlers as IncomingCallHandlers,
  // WSClient types
  ExternalOnlineParams as OnlineParams,
  ExternalHandlePushNotificationParams as HandlePushNotificationParams,
  ExternalHandlePushNotificationResult as HandlePushNotificationResult,
  ExternalDialParams as DialParams,
  ExternalReattachParams as ReattachParams,
  // Main interface types
  ExternalSignalWireClient as SignalWireClient,
  ExternalSignalWireContract as SignalWireContract,
  ExternalSignalWireClientParams as SignalWireClientParams,
  ExternalGetSubscriberInfoResponse as GetSubscriberInfoResponse,
  ExternalGetSubscriberInfoResult as GetSubscriberInfoResult,
  ExternalPaginatedResponse as PaginatedResponse,
  ExternalPaginatedResult as PaginatedResult,
}

/**
 * Build Video Element
 */
export { buildVideoElement } from './buildVideoElement'
export { LocalVideoOverlay, OverlayMap, UserOverlay } from './VideoOverlays'
