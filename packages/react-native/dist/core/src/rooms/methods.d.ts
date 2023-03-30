import type { BaseRoomInterface, RoomSessionRecording, RoomSessionPlayback, RoomSessionStream } from '.';
import type { VideoMemberEntity, MemberCommandParams, VideoPosition } from '../types';
import type { MediaAllowed, VideoMeta } from '../utils/interfaces';
declare type RoomMethodParams = Record<string, unknown>;
interface RoomMethodPropertyDescriptor<OutputType, ParamsType> extends PropertyDescriptor {
    value: (params: ParamsType) => Promise<OutputType>;
}
declare type RoomMethodDescriptor<OutputType = unknown, ParamsType = RoomMethodParams> = RoomMethodPropertyDescriptor<OutputType, ParamsType> & ThisType<BaseRoomInterface<string>>;
/**
 * Type the params for each room member method that uses the provided
 * memberId or fallback to the instance memberId. Additional params
 * can be passed as `value` or `volume`.
 */
interface RoomMemberMethodParams extends Record<string, unknown> {
    memberId?: string;
}
/**
 * Room Methods
 */
export declare const getLayouts: RoomMethodDescriptor<{
    layouts: string[];
}, RoomMethodParams>;
export declare const getMembers: RoomMethodDescriptor<{
    members: VideoMemberEntity[];
}, RoomMethodParams>;
export interface SetLayoutParams {
    name: string;
    positions?: Record<string, VideoPosition>;
}
export declare const setLayout: RoomMethodDescriptor<void, RoomMethodParams>;
export interface SetPositionsParams {
    positions: Record<string, VideoPosition>;
}
export declare const setPositions: RoomMethodDescriptor<void, RoomMethodParams>;
export declare const hideVideoMuted: RoomMethodDescriptor<void, RoomMethodParams>;
export declare const showVideoMuted: RoomMethodDescriptor<void, RoomMethodParams>;
export declare const setHideVideoMuted: RoomMethodDescriptor<void, boolean>;
export interface GetRecordingsOutput {
    recordings: RoomSessionRecording[];
}
export declare const getRecordings: RoomMethodDescriptor<GetRecordingsOutput>;
export declare const startRecording: RoomMethodDescriptor<void>;
export interface GetPlaybacksOutput {
    playbacks: RoomSessionPlayback[];
}
export declare const getPlaybacks: RoomMethodDescriptor<GetPlaybacksOutput>;
export declare type PlayParams = {
    url: string;
    volume?: number;
    positions?: Record<string, VideoPosition>;
    layout?: string;
    seekPosition?: number;
    /**
     * @deprecated Use {@link seekPosition} instead.
     * `currentTimecode` will be removed in v4.0.0
     */
    currentTimecode?: number;
};
export declare const play: RoomMethodDescriptor<any, PlayParams>;
interface GetMetaOutput {
    meta: VideoMeta;
}
export declare const getMeta: RoomMethodDescriptor<GetMetaOutput, RoomMethodParams>;
export interface SetMetaParams extends Record<string, unknown> {
}
export declare const setMeta: RoomMethodDescriptor<void, SetMetaParams>;
export interface UpdateMetaParams extends Record<string, unknown> {
}
export declare const updateMeta: RoomMethodDescriptor<void, UpdateMetaParams>;
export declare type DeleteMetaParams = string[];
export declare const deleteMeta: RoomMethodDescriptor<any, DeleteMetaParams>;
export interface GetStreamsOutput {
    streams: RoomSessionStream[];
}
export declare const getStreams: RoomMethodDescriptor<GetStreamsOutput>;
export interface StartStreamParams {
    url: string;
}
export declare const startStream: RoomMethodDescriptor<any, StartStreamParams>;
export declare type GetLayouts = ReturnType<typeof getLayouts.value>;
export declare type GetMembers = ReturnType<typeof getMembers.value>;
export declare type HideVideoMuted = ReturnType<typeof hideVideoMuted.value>;
export declare type ShowVideoMuted = ReturnType<typeof showVideoMuted.value>;
export declare type SetHideVideoMuted = ReturnType<typeof setHideVideoMuted.value>;
export declare type GetRecordings = ReturnType<typeof getRecordings.value>;
export declare type StartRecording = ReturnType<typeof startRecording.value>;
export declare type GetPlaybacks = ReturnType<typeof getPlaybacks.value>;
export declare type Play = ReturnType<typeof play.value>;
export declare type GetMeta = ReturnType<typeof getMeta.value>;
export declare type SetMeta = ReturnType<typeof setMeta.value>;
export declare type UpdateMeta = ReturnType<typeof updateMeta.value>;
export declare type DeleteMeta = ReturnType<typeof deleteMeta.value>;
export declare type GetStreams = ReturnType<typeof getStreams.value>;
export declare type StartStream = ReturnType<typeof startStream.value>;
/**
 * Room Member Methods
 */
export declare const audioMuteMember: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare const audioUnmuteMember: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare const videoMuteMember: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare const videoUnmuteMember: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare const deafMember: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare const undeafMember: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare const setDeaf: RoomMethodDescriptor<void, boolean>;
export declare const setInputVolumeMember: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare const setOutputVolumeMember: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare const setInputSensitivityMember: RoomMethodDescriptor<void, RoomMemberMethodParams>;
interface PromoteDemoteMemberParams extends Required<MemberCommandParams> {
    mediaAllowed?: MediaAllowed;
}
export interface PromoteMemberParams extends PromoteDemoteMemberParams {
    permissions?: string[];
    meta?: VideoMeta;
    joinAudioMuted?: boolean;
    joinVideoMuted?: boolean;
}
export declare const promote: RoomMethodDescriptor<void, PromoteMemberParams>;
export interface DemoteMemberParams extends PromoteDemoteMemberParams {
}
export declare const demote: RoomMethodDescriptor<void, DemoteMemberParams>;
export interface SetMemberPositionParams extends MemberCommandParams {
    position: VideoPosition;
}
export declare const setMemberPosition: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare const removeMember: RoomMethodDescriptor<void, Required<RoomMemberMethodParams>>;
export declare const removeAllMembers: RoomMethodDescriptor<void, void>;
interface GetMemberMetaOutput {
    meta: VideoMeta;
}
export declare const getMemberMeta: RoomMethodDescriptor<GetMemberMetaOutput, RoomMemberMethodParams>;
export interface SetMemberMetaParams extends MemberCommandParams {
    meta: VideoMeta;
}
export declare const setMemberMeta: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export interface UpdateMemberMetaParams extends MemberCommandParams {
    meta: VideoMeta;
}
export declare const updateMemberMeta: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export interface DeleteMemberMetaParams extends MemberCommandParams {
    keys: string[];
}
export declare const deleteMemberMeta: RoomMethodDescriptor<void, RoomMemberMethodParams>;
export declare type AudioMuteMember = ReturnType<typeof audioMuteMember.value>;
export declare type AudioUnmuteMember = ReturnType<typeof audioUnmuteMember.value>;
export declare type VideoMuteMember = ReturnType<typeof videoMuteMember.value>;
export declare type VideoUnmuteMember = ReturnType<typeof videoUnmuteMember.value>;
export declare type DeafMember = ReturnType<typeof deafMember.value>;
export declare type UndeafMember = ReturnType<typeof undeafMember.value>;
export declare type SetDeaf = ReturnType<typeof setDeaf.value>;
export declare type SetLayout = ReturnType<typeof setLayout.value>;
export declare type SetPositions = ReturnType<typeof setPositions.value>;
export declare type SetInputVolumeMember = ReturnType<typeof setInputVolumeMember.value>;
export declare type SetOutputVolumeMember = ReturnType<typeof setOutputVolumeMember.value>;
export declare type SetInputSensitivityMember = ReturnType<typeof setInputSensitivityMember.value>;
export declare type SetMemberPosition = ReturnType<typeof setMemberPosition.value>;
export declare type RemoveMember = ReturnType<typeof removeMember.value>;
export declare type RemoveAllMembers = ReturnType<typeof removeAllMembers.value>;
export declare type GetMemberMeta = ReturnType<typeof getMemberMeta.value>;
export declare type SetMemberMeta = ReturnType<typeof setMemberMeta.value>;
export declare type UpdateMemberMeta = ReturnType<typeof updateMemberMeta.value>;
export declare type DeleteMemberMeta = ReturnType<typeof deleteMemberMeta.value>;
export declare type PromoteMember = ReturnType<typeof promote.value>;
export declare type DemoteMember = ReturnType<typeof demote.value>;
export {};
//# sourceMappingURL=methods.d.ts.map