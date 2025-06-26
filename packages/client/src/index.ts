/**
 * Welcome to the technical documentation for the Unified Client JavaScript SDK(a.k.a Fabric SDK).
 * @module
 */

import { 
  FabricRoomEventParams, 
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
  FabricLayoutChangedEventParams,
  FabricMemberJoinedEventParams,
  FabricMemberUpdatedEventParams,
  FabricMemberLeftEventParams,
  FabricMemberTalkingEventParams,
  FabricMemberEventParams,
  FabricMemberEntity,
  InternalFabricMemberEntity,
  ConversationMessageEventName,
  ConversationMessageEvent,
  ConversationEventParams,
  ConversationEvent,
  EventEmitter
} from '@signalwire/core'
import {
  BaseConnectionOptions,
  ConnectionOptions
} from '@signalwire/webrtc'
import {
  CallJoinedEventParams,
  RoomSessionObjectEventsHandlerMap,
  RoomSessionObjectEvents,
  RoomEventNames,
  StartScreenShareOptions
} from './utils/interfaces'


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

type ExternalFabricRoomEventParams = Prettify<FabricRoomEventParams>
type ExternalBaseComponentOptions = Prettify<BaseComponentOptions>
type ExternalBaseConnectionState = Prettify<BaseConnectionState>
type ExternalClientEvents = Prettify<ClientEvents>
type ExternalEmitterContract<EventTypes extends EventEmitter.ValidEventTypes> = Prettify<EmitterContract<EventTypes>>
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
type ExternalFabricLayoutChangedEventParams = Prettify<FabricLayoutChangedEventParams>
type ExternalFabricMemberJoinedEventParams = Prettify<FabricMemberJoinedEventParams>
type ExternalFabricMemberUpdatedEventParams = Prettify<FabricMemberUpdatedEventParams>
type ExternalFabricMemberLeftEventParams = Prettify<FabricMemberLeftEventParams>
type ExternalFabricMemberTalkingEventParams = Prettify<FabricMemberTalkingEventParams>
type ExternalFabricMemberEventParams = Prettify<FabricMemberEventParams>
type ExternalFabricMemberEntity = Prettify<FabricMemberEntity>
type ExternalInternalFabricMemberEntity = Prettify<InternalFabricMemberEntity>
type ExternalConversationMessageEventName = Prettify<ConversationMessageEventName>
type ExternalConversationMessageEvent = Prettify<ConversationMessageEvent>
type ExternalConversationEventParams = Prettify<ConversationEventParams>
type ExternalConversationEvent = Prettify<ConversationEvent>

// WebRTC types
type ExternalBaseConnectionOptions = Prettify<BaseConnectionOptions>
type ExternalConnectionOptions = Prettify<ConnectionOptions>

// Local interface types
type ExternalCallJoinedEventParams = Prettify<CallJoinedEventParams>
type ExternalRoomSessionObjectEventsHandlerMap = Prettify<RoomSessionObjectEventsHandlerMap>
type ExternalRoomSessionObjectEvents = Prettify<RoomSessionObjectEvents>
type ExternalRoomEventNames = Prettify<RoomEventNames>
type ExternalStartScreenShareOptions = Prettify<StartScreenShareOptions>

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
  ExternalFabricLayoutChangedEventParams as UnifiedCommunicationLayoutChangedEventParams,
  ExternalFabricMemberJoinedEventParams as UnifiedCommunicationMemberJoinedEventParams,
  ExternalFabricMemberUpdatedEventParams as UnifiedCommunicationMemberUpdatedEventParams,
  ExternalFabricMemberLeftEventParams as UnifiedCommunicationMemberLeftEventParams,
  ExternalFabricMemberTalkingEventParams as UnifiedCommunicationMemberTalkingEventParams,
  ExternalFabricMemberEventParams as UnifiedCommunicationMemberEventParams,
  ExternalFabricMemberEntity as UnifiedCommunicationMemberEntity,
  ExternalInternalFabricMemberEntity as InternalUnifiedCommunicationMemberEntity,
  ExternalConversationMessageEventName as ConversationMessageEventName,
  ExternalConversationMessageEvent as ConversationMessageEvent,
  ExternalConversationEventParams as ConversationEventParams,
  ExternalConversationEvent as ConversationEvent,
  ExternalFabricRoomEventParams as UnifiedCommunicationEventParams
}

export {
  ExternalBaseConnectionOptions as BaseConnectionOptions,
  ExternalConnectionOptions as ConnectionOptions,
}

export {
  ExternalCallJoinedEventParams as CallJoinedEventParams,
  ExternalRoomSessionObjectEventsHandlerMap as RoomSessionObjectEventsHandlerMap,
  ExternalRoomSessionObjectEvents as RoomSessionObjectEvents,
  ExternalRoomEventNames as RoomEventNames,
  ExternalStartScreenShareOptions as StartScreenShareOptions,
}

/**
 * Build Video Element
 */
export { buildVideoElement } from './buildVideoElement'
export { LocalVideoOverlay, OverlayMap, UserOverlay } from './VideoOverlays'
