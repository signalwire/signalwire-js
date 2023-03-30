import type { SwEvent, VideoPosition } from '.';
import type { CamelToSnakeCase, SnakeToCamelCase, EntityUpdated, ToInternalVideoEvent, OnlyStateProperties, OnlyFunctionProperties } from './utils';
import * as Rooms from '../rooms';
import { Authorization } from '..';
/**
 * Used to not duplicate member fields across constants and types
 * and generate `MEMBER_UPDATED_EVENTS` below.
 * `key`: `type`
 */
export declare const INTERNAL_MEMBER_UPDATABLE_PROPS: {
    audio_muted: boolean;
    video_muted: boolean;
    deaf: boolean;
    visible: boolean;
    input_volume: number;
    output_volume: number;
    input_sensitivity: number;
};
export declare type InternalVideoMemberUpdatableProps = typeof INTERNAL_MEMBER_UPDATABLE_PROPS;
export declare const INTERNAL_MEMBER_UPDATED_EVENTS: ("video.member.updated.audio_muted" | "video.member.updated.video_muted" | "video.member.updated.deaf" | "video.member.updated.visible" | "video.member.updated.input_volume" | "video.member.updated.output_volume" | "video.member.updated.input_sensitivity")[];
declare type VideoMemberUpdatableProps = {
    [K in keyof InternalVideoMemberUpdatableProps as SnakeToCamelCase<K>]: InternalVideoMemberUpdatableProps[K];
};
export declare const MEMBER_UPDATABLE_PROPS: VideoMemberUpdatableProps;
export declare const MEMBER_UPDATED_EVENTS: ("member.updated.deaf" | "member.updated.visible" | "member.updated.audioMuted" | "member.updated.videoMuted" | "member.updated.inputVolume" | "member.updated.outputVolume" | "member.updated.inputSensitivity")[];
/**
 * Public event types
 */
export declare type MemberJoined = 'member.joined';
export declare type MemberLeft = 'member.left';
export declare type MemberUpdated = 'member.updated';
export declare type MemberTalking = 'member.talking';
export declare type MemberPromoted = 'member.promoted';
export declare type MemberDemoted = 'member.demoted';
/**
 * @privateRemarks
 *
 * This event will take care of handling multiple events at
 * once with the purpose of providing a nicer API for
 * keeping an up-to-date list of members within a certain
 * room.
 */
export declare type MemberListUpdated = 'memberList.updated';
/**
 * See {@link MEMBER_UPDATED_EVENTS} for the full list of events.
 */
export declare type MemberUpdatedEventNames = typeof MEMBER_UPDATED_EVENTS[number];
export declare type MemberTalkingStarted = 'member.talking.started';
export declare type MemberTalkingEnded = 'member.talking.ended';
/**
 * Use `member.talking.started` instead
 * @deprecated
 */
export declare type MemberTalkingStart = 'member.talking.start';
/**
 * Use `member.talking.ended` instead
 * @deprecated
 */
export declare type MemberTalkingStop = 'member.talking.stop';
export declare type MemberTalkingEventNames = MemberTalking | MemberTalkingStarted | MemberTalkingEnded | MemberTalkingStart | MemberTalkingStop;
/**
 * List of public events
 */
export declare type VideoMemberEventNames = MemberJoined | MemberLeft | MemberUpdated | MemberUpdatedEventNames | MemberTalkingEventNames | MemberListUpdated;
export declare type InternalMemberUpdatedEventNames = typeof INTERNAL_MEMBER_UPDATED_EVENTS[number];
/**
 * List of internal events
 * @internal
 */
export declare type InternalVideoMemberEventNames = ToInternalVideoEvent<MemberJoined | MemberLeft | MemberUpdated | MemberTalkingEventNames> | InternalMemberUpdatedEventNames;
export declare type VideoMemberType = 'member' | 'screen' | 'device';
/**
 * Public Contract for a VideoMember
 */
export interface VideoMemberContract extends VideoMemberUpdatableProps {
    /** Unique id of this member. */
    id: string;
    /** Id of the room associated to this member. */
    roomId: string;
    /** Id of the room session associated to this member. */
    roomSessionId: string;
    /** Name of this member. */
    name: string;
    /** Id of the parent video member, if it exists. */
    parentId?: string;
    /** Type of this video member. Can be `'member'`, `'screen'`, or `'device'`. */
    type: VideoMemberType;
    /**
     * Position requested for this member in the layout. This may differ from
     * `currentPosition` if the requested position is not currently available.
     */
    requestedPosition: VideoPosition;
    /** Current position of this member in the layout. */
    currentPosition?: VideoPosition;
    /** Metadata associated to this member. */
    meta?: Record<string, unknown>;
    /**
     * Mutes the outbound audio for this member (e.g., the one coming from a
     * microphone). The other participants will not hear audio from the muted
     * participant anymore.
     *
     * @example
     * ```typescript
     * await member.audioMute()
     * ```
     */
    audioMute(): Rooms.AudioMuteMember;
    /**
     * Unmutes the outbound audio for this member (e.g., the one coming from a
     * microphone) if it had been previously muted.
     *
     * @example
     * ```typescript
     * await member.audioUnmute()
     * ```
     */
    audioUnmute(): Rooms.AudioUnmuteMember;
    /**
     * Mutes the outbound video for this member (e.g., the one coming from a
     * webcam). Participants will see a mute image instead of the video stream.
     *
     * @example
     * ```typescript
     * await member.videoMute()
     * ```
     */
    videoMute(): Rooms.VideoMuteMember;
    /**
     * Unmutes the outbound video for this member (e.g., the one coming from a
     * webcam) if it had been previously muted. Participants will start seeing the
     * video stream again.
     *
     * @example
     * ```typescript
     * await member.videoUnmute()
     * ```
     */
    videoUnmute(): Rooms.VideoUnmuteMember;
    /**
     * Mutes or unmutes the inbound audio for the member (e.g., the one that get
     * played through this member's speakers). When the inbound audio is muted,
     * the affected participant will not hear audio from the other participants
     * anymore.
     *
     * @param value whether to mute the audio
     *
     * @example
     * ```typescript
     * await member.setDeaf(true)
     * ```
     */
    setDeaf(value: boolean): Rooms.SetDeaf;
    /**
     * @deprecated Use {@link setInputVolume} instead.
     * `setMicrophoneVolume` will be removed in v4.0.0
     */
    setMicrophoneVolume(params: {
        volume: number;
    }): Rooms.SetInputVolumeMember;
    /**
     * Sets the input volume for the member (e.g., the microphone input level).
     *
     * @param params
     * @param params.volume desired volume. Values range from -50 to 50, with a
     * default of 0.
     *
     * @example
     * ```typescript
     * await member.setInputVolume({volume: -10})
     * ```
     */
    setInputVolume(params: {
        volume: number;
    }): Rooms.SetInputVolumeMember;
    /**
     * @deprecated Use {@link setOutputVolume} instead.
     * `setSpeakerVolume` will be removed in v4.0.0
     */
    setSpeakerVolume(params: {
        volume: number;
    }): Rooms.SetOutputVolumeMember;
    /**
     * Sets the output volume for the member (e.g., the speaker output level).
     *
     * @param params
     * @param params.volume desired volume. Values range from -50 to 50, with a
     * default of 0.
     *
     * @example
     * ```typescript
     * await member.setOutputVolume({volume: -10})
     * ```
     */
    setOutputVolume(params: {
        volume: number;
    }): Rooms.SetOutputVolumeMember;
    /**
     * Sets the input level at which the participant is identified as currently
     * speaking.
     *
     * @param params
     * @param params.value desired sensitivity. The default value is 30 and the
     * scale goes from 0 (lowest sensitivity, essentially muted) to 100 (highest
     * sensitivity).
     *
     * @example
     * ```typescript
     * await member.setInputSensitivity({value: 80})
     * ```
     */
    setInputSensitivity(params: {
        value: number;
    }): Rooms.SetInputSensitivityMember;
    /**
     * Removes this member from the room.
     *
     * @example
     * ```typescript
     * await member.remove()
     * ```
     */
    remove(): Rooms.RemoveMember;
}
/**
 * VideoMember properties
 */
export declare type VideoMemberEntity = OnlyStateProperties<VideoMemberContract>;
/**
 * VideoMember methods
 */
export declare type VideoMemberMethods = OnlyFunctionProperties<VideoMemberContract>;
/**
 * VideoMemberEntity entity plus `updated` field
 */
export declare type VideoMemberEntityUpdated = EntityUpdated<VideoMemberEntity>;
/**
 * VideoMemberEntity entity for internal usage (converted to snake_case)
 * @internal
 */
export declare type InternalVideoMemberEntity = {
    [K in NonNullable<keyof VideoMemberEntity> as CamelToSnakeCase<K>]: VideoMemberEntity[K];
};
/**
 * VideoMember entity plus `updated` field
 * for internal usage (converted to snake_case)
 * @internal
 */
export declare type InternalVideoMemberEntityUpdated = EntityUpdated<InternalVideoMemberEntity>;
export interface InternalVideoMemberUpdatedEvent extends SwEvent {
    event_type: InternalMemberUpdatedEventNames;
    params: VideoMemberUpdatedEventParams;
}
export interface InternalVideoMemberTalkingEvent extends SwEvent {
    event_type: MemberTalkingEventNames;
    params: VideoMemberTalkingEventParams;
}
export declare type InternalVideoMemberEvent = InternalVideoMemberUpdatedEvent | InternalVideoMemberTalkingEvent;
/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */
/**
 * 'video.member.joined'
 */
export interface VideoMemberJoinedEventParams {
    room_session_id: string;
    room_id: string;
    member: InternalVideoMemberEntity;
}
export interface VideoMemberJoinedEvent extends SwEvent {
    event_type: ToInternalVideoEvent<MemberJoined>;
    params: VideoMemberJoinedEventParams;
}
/**
 * 'video.member.updated'
 */
export interface VideoMemberUpdatedEventParams {
    room_session_id: string;
    room_id: string;
    member: InternalVideoMemberEntityUpdated;
}
export interface VideoMemberUpdatedEvent extends SwEvent {
    event_type: ToInternalVideoEvent<MemberUpdated>;
    params: VideoMemberUpdatedEventParams;
}
/**
 * 'video.member.left'
 */
export interface VideoMemberLeftEventParams {
    room_session_id: string;
    room_id: string;
    member: InternalVideoMemberEntity;
}
export interface VideoMemberLeftEvent extends SwEvent {
    event_type: ToInternalVideoEvent<MemberLeft>;
    params: VideoMemberLeftEventParams;
}
/**
 * 'video.member.talking'
 */
export interface VideoMemberTalkingEventParams {
    room_session_id: string;
    room_id: string;
    member: {
        id: string;
        talking: boolean;
    };
}
export interface VideoMemberTalkingEvent extends SwEvent {
    event_type: ToInternalVideoEvent<MemberTalking>;
    params: VideoMemberTalkingEventParams;
}
/**
 * 'video.member.promoted'
 */
export interface VideoMemberPromotedEventParams {
    room_session_id: string;
    room_id: string;
    member_id: string;
    authorization: Authorization;
}
export interface VideoMemberPromotedEvent extends SwEvent {
    event_type: ToInternalVideoEvent<MemberPromoted>;
    params: VideoMemberPromotedEventParams;
}
/**
 * 'video.member.demoted'
 */
export interface VideoMemberDemotedEventParams {
    room_session_id: string;
    room_id: string;
    member_id: string;
    authorization: Authorization;
}
export interface VideoMemberDemotedEvent extends SwEvent {
    event_type: ToInternalVideoEvent<MemberDemoted>;
    params: VideoMemberDemotedEventParams;
}
export declare type VideoMemberEvent = VideoMemberJoinedEvent | VideoMemberLeftEvent | VideoMemberUpdatedEvent | VideoMemberTalkingEvent | VideoMemberPromotedEvent | VideoMemberDemotedEvent;
/**
 * VideoMemberPromotedEventParams and VideoMemberDemotedEventParams
 * are special events without the full `member` object so we avoid
 * them in VideoMemberEventParams
 */
export declare type VideoMemberEventParams = VideoMemberJoinedEventParams | VideoMemberLeftEventParams | VideoMemberUpdatedEventParams | VideoMemberTalkingEventParams;
export {};
//# sourceMappingURL=videoMember.d.ts.map