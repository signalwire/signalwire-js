import type {
  VideoRoomEventNames,
  RoomStarted,
  RoomSubscribed,
  RoomUpdated,
  RoomEnded,
  VideoMember,
} from '@signalwire/core'

/** @deprecated */
export type RoomStartedEventName = RoomStarted
/** @deprecated */
export type RoomEndedEventName = RoomEnded
/** @deprecated */
export type RoomSubscribedEventName = RoomSubscribed
/** @deprecated */
export type RoomUpdatedEventName = RoomUpdated
/** @deprecated */
export type RoomEvent = VideoRoomEventNames
/** @deprecated */
export type RoomMember = VideoMember & { type: 'member' }
/** @deprecated */
export type RoomScreenShare = VideoMember & { type: 'screen' }
/** @deprecated */
export type RoomDevice = VideoMember & { type: 'device' }

export * as Video from './video'
export * as WebRTC from './webrtc'
export type {
  BaseComponentOptions,
  BaseConnectionState,
  ClientEvents,
  Emitter,
  RoomEventNames,
  RTCTrackEventName,
  UserOptions,
  SessionStatus,
  SessionEvents,
  VideoLayout,
  VideoLayoutEventNames,
  VideoRoomEventNames,
  VideoRoomEventParams,
  VideoMember,
  VideoMemberEventNames,
  MemberTalkingEventNames,
  VideoMemberTalkingEventParams,
  InternalVideoMember,
  Rooms,
} from '@signalwire/core'
export type {
  BaseConnectionOptions,
  ConnectionOptions,
} from '@signalwire/webrtc'
export type {
  RoomObjectEventsHandlerMap,
  RoomObjectEvents,
} from './utils/interfaces'
