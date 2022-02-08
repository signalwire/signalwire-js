import {
  VideoRoomSessionEventNames,
  VideoRoomEvent,
  InternalVideoRoomSessionEventNames,
  InternalVideoRoomEvent,
} from './videoRoomSession'
import {
  VideoMemberEventNames,
  VideoMemberEvent,
  InternalVideoMemberEventNames,
  InternalVideoMemberEvent,
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
import {
  VideoPlaybackEventNames,
  VideoPlaybackEvent,
  InternalVideoPlaybackEventNames,
} from './videoPlayback'

export * from './videoRoomSession'
export * from './videoMember'
export * from './videoLayout'
export * from './videoRecording'
export * from './videoPlayback'

export type RTCTrackEventName = 'track'

export type VideoPosition =
  | 'self'
  | 'reserved'
  | `reserved-${number}`
  | 'standard'
  | `standard-${number}`
  | 'off-canvas'

export type VideoRole = VideoPosition

export type VideoPositions = Record<string, VideoPosition>

/**
 * List of all the events a RoomObject can listen to
 */
export type RoomEventNames =
  | VideoRoomSessionEventNames
  | VideoMemberEventNames
  | VideoLayoutEventNames
  | VideoRecordingEventNames
  | VideoPlaybackEventNames
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
  | InternalVideoPlaybackEventNames
  | RTCTrackEventName

export type InternalVideoAPIEvent =
  | InternalVideoRoomEvent
  | InternalVideoMemberEvent

export type VideoAPIEventParams =
  | VideoRoomEvent
  | VideoMemberEvent
  | VideoLayoutEvent
  | VideoRecordingEvent
  | VideoPlaybackEvent
