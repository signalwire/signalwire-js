import type {
  VideoRoomSessionEventNames,
  RoomStarted,
  RoomSubscribed,
  RoomUpdated,
  RoomEnded,
  VideoMemberEntity,
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
export type RoomEvent = VideoRoomSessionEventNames
/** @deprecated */
export type RoomMember = VideoMemberEntity & { type: 'member' }
/** @deprecated */
export type RoomScreenShare = VideoMemberEntity & { type: 'screen' }
/** @deprecated */
export type RoomDevice = VideoMemberEntity & { type: 'device' }

export * as Video from './video'

/**
 * The WebRTC namespace includes functions that give you access to the input and
 * output media devices available on the user's machine. For example, you can
 * use these functions to request permission and get access to the media stream
 * from a webcam, from a microphone, or from a screen sharing.
 */
export * as WebRTC from './webrtc'
export type {
  BaseComponentOptions,
  BaseConnectionState,
  ClientEvents,
  EmitterContract,
  RoomEventNames,
  RTCTrackEventName,
  UserOptions,
  SessionStatus,
  SessionEvents,
  VideoLayout,
  VideoLayoutEventNames,
  VideoRoomSessionEventNames,
  VideoRoomEventParams,
  VideoMemberEntity,
  VideoMemberEventNames,
  MemberTalkingEventNames,
  VideoMemberTalkingEventParams,
  InternalVideoMemberEntity,
} from '@signalwire/core'
export type {
  BaseConnectionOptions,
  ConnectionOptions,
} from '@signalwire/webrtc'
export type {
  RoomObjectEventsHandlerMap,
  RoomObjectEvents,
} from './utils/interfaces'
