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
import {
  VideoRecordingEventNames,
  VideoRecordingEvent,
  InternalVideoRecordingEventNames,
} from './videoRecording'

export * from './videoRoom'
export * from './videoMember'
export * from './videoLayout'
export * from './videoRecording'

export type RTCTrackEventName = 'track'

/**
 * List of all the events a RoomObject can listen to
 */
export type RoomEventNames =
  | VideoRoomEventNames
  | VideoMemberEventNames
  | VideoLayoutEventNames
  | VideoRecordingEventNames
  | RTCTrackEventName

/**
 * List of all the internal events
 * for the video sdk
 * @internal
 */
export type InternalVideoEventNames =
  | InternalVideoRoomEventNames
  | InternalVideoMemberEventNames
  | InternalVideoLayoutEventNames
  | InternalVideoRecordingEventNames
  | RTCTrackEventName

export type VideoAPIEventParams =
  | VideoRoomEvent
  | VideoMemberEvent
  | VideoLayoutEvent
  | VideoRecordingEvent
