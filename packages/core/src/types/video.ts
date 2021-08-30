import {
  VideoRoomEventNames,
  VideoRoomEvent,
  InternalVideoRoomEventNames,
} from './videoRoom'

import {
  VideoMemberEventNames,
  VideoMemberEvent,
  InternalVideoMemberEventNames,
} from './videoMember'
import {
  VideoLayoutEventNames,
  InternalVideoLayoutEventNames,
  VideoLayoutEvent,
} from './videoLayout'

export * from './videoRoom'
export * from './videoMember'
export * from './videoLayout'

export type RTCTrackEventName = 'track'

/**
 * List of all the events a RoomObject can listen to
 */
export type RoomEventNames =
  | VideoRoomEventNames
  | VideoMemberEventNames
  | VideoLayoutEventNames
  | RTCTrackEventName

/**
 * List of all the internal events
 * for the video sdk
 * @internal
 */
export type InternalVideoEvent =
  | InternalVideoRoomEventNames
  | InternalVideoMemberEventNames
  | InternalVideoLayoutEventNames
  | RTCTrackEventName

export type VideoAPIEventParams =
  | VideoRoomEvent
  | VideoMemberEvent
  | VideoLayoutEvent
