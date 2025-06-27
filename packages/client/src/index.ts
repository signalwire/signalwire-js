/**
 * Welcome to the technical documentation for the Unified Client JavaScript SDK(a.k.a Fabric SDK).
 * @module
 */

import {
  Prettify,
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
} from '@signalwire/core'
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

// export { VideoRoomSession } from './video'
export { RoomSessionScreenShare } from './RoomSessionScreenShare'
export { RoomSessionDevice } from './RoomSessionDevice'

/**
 * The WebRTC namespace includes functions that give you access to the input and
 * output media devices available on the user's machine. For example, you can
 * use these functions to request permission and get access to the media stream
 * from a webcam, from a microphone, or from a screen sharing.
 */
export * as WebRTC from './webrtc'

type ExternalFabricRoomEventParams = Prettify<FabricCallRoomEventParams>
type ExternalBaseComponentOptions = Prettify<BaseComponentOptions>
type ExternalBaseConnectionState = Prettify<BaseConnectionState>
type ExternalClientEvents = Prettify<ClientEvents>
type ExternalEmitterContract<EventTypes extends EventEmitter.ValidEventTypes> =
  Prettify<EmitterContract<EventTypes>>
type ExternalRTCTrackEventName = Prettify<RTCTrackEventName>
type ExternalUserOptions = Prettify<UserOptions>
type ExternalSessionStatus = Prettify<SessionStatus>
type ExternalSessionEvents = Prettify<SessionEvents>
type ExternalVideoLayout = Prettify<VideoLayout>
type ExternalInternalVideoLayout = Prettify<InternalVideoLayout>
type ExternalVideoPosition = Prettify<VideoPosition>
type ExternalVideoPositions = Prettify<VideoPositions>
type ExternalCallUpdatedEventParams = Prettify<CallUpdatedEventParams>
type ExternalCallLeftEventParams = Prettify<CallLeftEventParams>
type ExternalCallStateEventParams = Prettify<CallStateEventParams>
type ExternalCallPlayEventParams = Prettify<CallPlayEventParams>
type ExternalCallConnectEventParams = Prettify<CallConnectEventParams>
type ExternalCallRoomEventParams = Prettify<CallRoomEventParams>
type ExternalFabricLayoutChangedEventParams =
  Prettify<CallLayoutChangedEventParams>
type ExternalFabricMemberJoinedEventParams =
  Prettify<CallMemberJoinedEventParams>
type ExternalFabricMemberUpdatedEventParams =
  Prettify<CallMemberUpdatedEventParams>
type ExternalFabricMemberLeftEventParams = Prettify<CallMemberLeftEventParams>
type ExternalFabricMemberTalkingEventParams =
  Prettify<CallMemberTalkingEventParams>
type ExternalFabricMemberEventParams = Prettify<CallMemberEventParams>
type ExternalFabricMemberEntity = Prettify<CallMemberEntity>
type ExternalInternalFabricMemberEntity = Prettify<InternalCallMemberEntity>
type ExternalConversationMessageEventName =
  Prettify<ConversationMessageEventName>
type ExternalConversationMessageEvent = Prettify<ConversationMessageEvent>
type ExternalConversationEventParams = Prettify<ConversationEventParams>
type ExternalConversationEvent = Prettify<ConversationEvent>

// WebRTC types
type ExternalBaseConnectionOptions = Prettify<BaseConnectionOptions>
type ExternalConnectionOptions = Prettify<ConnectionOptions>
type ExternalMicrophoneAnalyzer = Prettify<MicrophoneAnalyzer>

// Local interface types
type ExternalCallJoinedEventParams = Prettify<CallJoinedEventParams>
type ExternalRoomSessionObjectEventsHandlerMap =
  Prettify<RoomSessionObjectEventsHandlerMap>
type ExternalRoomSessionObjectEvents = Prettify<RoomSessionObjectEvents>
type ExternalRoomEventNames = Prettify<RoomEventNames>
type ExternalStartScreenShareOptions = Prettify<StartScreenShareOptions>

// Fabric types - Address
type ExternalResourceType = Prettify<ResourceType>
type ExternalGetAddressResponse = Prettify<GetAddressResponse>
type ExternalAddress = Prettify<Address>
type ExternalGetAddressesParams = Prettify<GetAddressesParams>
type ExternalGetAddressByIdParams = Prettify<GetAddressByIdParams>
type ExternalGetAddressByNameParams = Prettify<GetAddressByNameParams>
type ExternalGetAddressParams = Prettify<GetAddressParams>
type ExternalGetAddressResult = Prettify<GetAddressResult>
type ExternalGetAddressesResponse = Prettify<GetAddressesResponse>
type ExternalGetAddressesResult = Prettify<GetAddressesResult>

// Fabric types - Capabilities
type ExternalCapabilityOnOffStateContract =
  Prettify<CapabilityOnOffStateContract>
type ExternalMemberCapabilityContract = Prettify<MemberCapabilityContract>
type ExternalCallCapabilitiesContract = Prettify<CallCapabilitiesContract>

// Fabric types - Conversation
type ExternalConversationContract = Prettify<ConversationContract>
type ExternalSendConversationMessageParams =
  Prettify<SendConversationMessageParams>
type ExternalSendConversationMessageResponse =
  Prettify<SendConversationMessageResponse>
type ExternalSendConversationMessageResult =
  Prettify<SendConversationMessageResult>
type ExternalGetConversationsParams = Prettify<GetConversationsParams>
type ExternalConversationResponse = Prettify<ConversationResponse>
type ExternalGetConversationsResponse = Prettify<GetConversationsResponse>
type ExternalGetConversationsResult = Prettify<GetConversationsResult>
type ExternalConversationSubscribeCallback =
  Prettify<ConversationSubscribeCallback>
type ExternalConversationSubscribeResult = Prettify<ConversationSubscribeResult>
type ExternalConversationChatMessagesSubscribeParams =
  Prettify<ConversationChatMessagesSubscribeParams>
type ExternalConversationChatMessagesSubscribeResult =
  Prettify<ConversationChatMessagesSubscribeResult>
type ExternalJoinConversationParams = Prettify<JoinConversationParams>
type ExternalJoinConversationResponse = Prettify<JoinConversationResponse>
type ExternalJoinConversationResult = Prettify<JoinConversationResult>
type ExternalGetMessagesParams = Prettify<GetMessagesParams>
type ExternalConversationMessage = Prettify<ConversationMessage>
type ExternalGetMessagesResult = Prettify<GetMessagesResult>
type ExternalConversationChatMessage = Prettify<ConversationChatMessage>
type ExternalGetConversationChatMessageParams =
  Prettify<GetConversationChatMessageParams>
type ExternalGetConversationChatMessageResult =
  Prettify<GetConversationChatMessageResult>
type ExternalGetConversationMessagesResponse =
  Prettify<GetConversationMessagesResponse>
type ExternalGetConversationMessagesParams =
  Prettify<GetConversationMessagesParams>
type ExternalGetConversationMessagesResult =
  Prettify<GetConversationMessagesResult>
type ExternalConversationAPISendMessageParams =
  Prettify<ConversationAPISendMessageParams>
type ExternalConversationAPIGetMessagesParams =
  Prettify<ConversationAPIGetMessagesParams>

// Fabric types - Device
type ExternalRegisterDeviceType = Prettify<RegisterDeviceType>
type ExternalRegisterDeviceParams = Prettify<RegisterDeviceParams>
type ExternalUnregisterDeviceParams = Prettify<UnregisterDeviceParams>
type ExternalRegisterDeviceResponse = Prettify<RegisterDeviceResponse>
type ExternalRegisterDeviceResult = Prettify<RegisterDeviceResult>

// Fabric types - IncomingCallManager
type ExternalIncomingInviteSource = Prettify<IncomingInviteSource>
type ExternalIncomingInvite = Prettify<IncomingInvite>
type ExternalIncomingInviteWithSource = Prettify<IncomingInviteWithSource>
type ExternalIncomingCallNotification = Prettify<IncomingCallNotification>
type ExternalIncomingCallHandler = Prettify<IncomingCallHandler>
type ExternalIncomingCallHandlers = Prettify<IncomingCallHandlers>

// Fabric types - WSClient
type ExternalOnlineParams = Prettify<OnlineParams>
type ExternalHandlePushNotificationParams =
  Prettify<HandlePushNotificationParams>
type ExternalHandlePushNotificationResult =
  Prettify<HandlePushNotificationResult>
type ExternalDialParams = Prettify<DialParams>
type ExternalReattachParams = Prettify<ReattachParams>

// Fabric types - Main interfaces
type ExternalSignalWireClient = Prettify<SignalWireClient>
type ExternalSignalWireContract = Prettify<SignalWireContract>
type ExternalSignalWireClientParams = Prettify<SignalWireClientParams>
type ExternalGetSubscriberInfoResponse = Prettify<GetSubscriberInfoResponse>
type ExternalGetSubscriberInfoResult = Prettify<GetSubscriberInfoResult>
type ExternalPaginatedResponse<T> = Prettify<PaginatedResponse<T>>
type ExternalPaginatedResult<T> = Prettify<PaginatedResult<T>>

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
