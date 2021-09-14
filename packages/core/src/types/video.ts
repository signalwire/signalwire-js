import {
  VideoRoomSessionEventNames,
  VideoRoomEvent,
  InternalVideoRoomSessionEventNames,
} from './videoRoomSession'
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

export * from './videoRoomSession'
export * from './videoMember'
export * from './videoLayout'
export * from './videoRecording'

export type RTCTrackEventName = 'track'

/**
 * List of all the events a RoomObject can listen to
 */
export type RoomEventNames =
  | VideoRoomSessionEventNames
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
  | InternalVideoRoomSessionEventNames
  | InternalVideoMemberEventNames
  | InternalVideoLayoutEventNames
  | InternalVideoRecordingEventNames
  | RTCTrackEventName

export type VideoAPIEventParams =
  | VideoRoomEvent
  | VideoMemberEvent
  | VideoLayoutEvent
  | VideoRecordingEvent
