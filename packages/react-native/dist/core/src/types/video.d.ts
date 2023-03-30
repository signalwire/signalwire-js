import { VideoRoomEvent, InternalVideoRoomSessionEventNames, InternalVideoRoomEvent } from './videoRoomSession';
import { VideoMemberEvent, InternalVideoMemberEventNames, InternalVideoMemberEvent } from './videoMember';
import { InternalVideoLayoutEventNames, VideoLayoutEvent } from './videoLayout';
import { VideoRecordingEvent, InternalVideoRecordingEventNames } from './videoRecording';
import { VideoPlaybackEvent, InternalVideoPlaybackEventNames } from './videoPlayback';
import { VideoStreamEvent, InternalVideoStreamEventNames } from './videoStream';
import { VideoRoomAudienceCountEvent } from '.';
import { MapToPubSubShape } from '..';
export * from './videoRoomSession';
export * from './videoMember';
export * from './videoLayout';
export * from './videoRecording';
export * from './videoPlayback';
export * from './videoStream';
export declare type RTCTrackEventName = 'track';
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
export declare type VideoPosition = 'auto' | `reserved-${number}` | `standard-${number}` | 'off-canvas';
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
export declare type VideoPositions = Record<string, VideoPosition>;
/**
 * List of all the internal events
 * for the video sdk
 * @internal
 */
export declare type InternalVideoEventNames = InternalVideoRoomSessionEventNames | InternalVideoMemberEventNames | InternalVideoLayoutEventNames | InternalVideoRecordingEventNames | InternalVideoPlaybackEventNames | InternalVideoStreamEventNames | RTCTrackEventName;
export declare type InternalVideoAPIEvent = InternalVideoRoomEvent | InternalVideoMemberEvent;
export declare type VideoAPIEventParams = VideoRoomEvent | VideoMemberEvent | VideoLayoutEvent | VideoRecordingEvent | VideoPlaybackEvent | VideoStreamEvent | VideoRoomAudienceCountEvent;
export declare type VideoAction = MapToPubSubShape<InternalVideoAPIEvent | VideoAPIEventParams | VideoRoomAudienceCountEvent>;
//# sourceMappingURL=video.d.ts.map