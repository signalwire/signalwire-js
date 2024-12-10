import {
  VideoRoomEvent,
  InternalVideoRoomSessionEventNames,
  InternalVideoRoomEvent,
  VideoRoomSessionEventNames,
} from './videoRoomSession'
import {
  VideoMemberEvent,
  InternalVideoMemberEventNames,
  InternalVideoMemberEvent,
  VideoMemberEventNames,
} from './videoMember'
import {
  InternalVideoLayoutEventNames,
  VideoLayoutEvent,
  VideoLayoutEventNames,
} from './videoLayout'
import {
  VideoRecordingEvent,
  InternalVideoRecordingEventNames,
  VideoRecordingEventNames,
} from './videoRecording'
import {
  VideoPlaybackEvent,
  InternalVideoPlaybackEventNames,
  VideoPlaybackEventNames,
} from './videoPlayback'
import {
  VideoStreamEvent,
  InternalVideoStreamEventNames,
  VideoStreamEventNames,
} from './videoStream'
import { VideoRoomAudienceCountEvent, VideoRoomDeviceEventNames } from '.'
import { MapToPubSubShape } from '..'

export * from './videoRoomSession'
export * from './videoMember'
export * from './videoLayout'
export * from './videoRecording'
export * from './videoPlayback'
export * from './videoStream'
export * from './videoRoomDevice'

export type RTCTrackEventName = 'track'

/**
 * Each video layout has a number of positions which members can be assigned to.
 * This type enumerates all the available position names. Note that not all
 * these position names may be available within a given layout.
 *
 *  - `auto`: the position of the member in the layout is determined automatically.
 *  - `reserved-n`: the _n_-th reserved position in the layout (e.g. `reserved-3`).
 *  - `standard-n`: the _n_-th standard position in the layout (e.g. `standard-3`).
 *  - `off-canvas`: the member is hidden outside the layout.
 */
export type VideoPosition =
  | 'auto'
  | `reserved-${number}`
  | `standard-${number}`
  | 'off-canvas'
  | 'playback'
  | 'full-screen'

/**
 * An object whose keys represent member IDs, and values are chosen from
 * {@link VideoPosition}. Instead of a member ID, in some contexts you can use
 * the special keyword `self` if you don't know yet the ID of the member which
 * is going to be created.
 *
 * For example:
 *
 * ```js
 * {
 *   "1bf4d4fb-a3e4-4d46-80a8-3ebfdceb2a60": "reserved-1",
 *   "e0c5be44-d6c7-438f-8cda-f859a1a0b1e7": "auto"
 * }
 * ```
 *
 * Or:
 *
 * ```js
 * {
 *   "self": "reserved-1"
 * }
 * ```
 */
export type VideoPositions = Record<string, VideoPosition>

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
  | InternalVideoStreamEventNames
  | RTCTrackEventName

export type InternalVideoAPIEvent =
  | InternalVideoRoomEvent
  | InternalVideoMemberEvent

export type VideoAPIEvent =
  | VideoRoomEvent
  | VideoMemberEvent
  | VideoLayoutEvent
  | VideoRecordingEvent
  | VideoPlaybackEvent
  | VideoStreamEvent
  | VideoRoomAudienceCountEvent

export type VideoAPIEventNames =
  | VideoRoomSessionEventNames
  | VideoMemberEventNames
  | VideoLayoutEventNames
  | VideoPlaybackEventNames
  | VideoRecordingEventNames
  | VideoRoomDeviceEventNames
  | VideoStreamEventNames

export type VideoAction = MapToPubSubShape<
  InternalVideoAPIEvent | VideoAPIEvent | VideoRoomAudienceCountEvent
>
