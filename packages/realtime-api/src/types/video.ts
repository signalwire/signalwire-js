import type {
  GlobalVideoEvents,
  VideoMemberEventNames,
  RoomStarted,
  RoomUpdated,
  RoomSubscribed,
  RoomEnded,
  VideoLayoutEventNames,
  MemberTalkingEventNames,
  Rooms,
  MemberUpdated,
  MemberUpdatedEventNames,
  RoomAudienceCount,
  VideoRoomAudienceCountEventParams,
  RoomSessionPlayback,
  RoomSessionRecording,
  OnRoomStarted,
  OnRoomEnded,
  OnRoomUpdated,
  OnRoomAudienceCount,
  OnRoomSubscribed,
  OnMemberUpdated,
  RoomSessionStream,
  OnLayoutChanged,
  OnMemberJoined,
  MemberJoined,
  OnMemberLeft,
  MemberLeft,
  OnMemberTalking,
  MemberTalking,
  OnMemberListUpdated,
  MemberListUpdated,
  PlaybackStarted,
  OnPlaybackStarted,
  OnPlaybackUpdated,
  PlaybackUpdated,
  OnPlaybackEnded,
  PlaybackEnded,
  OnRecordingStarted,
  RecordingStarted,
  OnRecordingUpdated,
  RecordingUpdated,
  OnRecordingEnded,
  RecordingEnded,
  OnStreamStarted,
  OnStreamEnded,
  StreamStarted,
  StreamEnded,
  OnMemberTalkingStarted,
  MemberTalkingStarted,
  OnMemberTalkingEnded,
  MemberTalkingEnded,
  OnMemberDeaf,
  OnMemberVisible,
  OnMemberAudioMuted,
  OnMemberVideoMuted,
  OnMemberInputVolume,
  OnMemberOutputVolume,
  OnMemberInputSensitivity,
} from '@signalwire/core'
import type { RoomSession } from '../video/RoomSession'
import type {
  RoomSessionMember,
  RoomSessionMemberUpdated,
} from '../video/RoomSessionMember'

/**
 * RealTime Video API
 */
export type RealTimeVideoApiEventsHandlerMapping = Record<
  GlobalVideoEvents,
  (room: RoomSession) => void
>

export type RealTimeVideoApiEvents = {
  [k in keyof RealTimeVideoApiEventsHandlerMapping]: RealTimeVideoApiEventsHandlerMapping[k]
}

export interface RealTimeVideoListeners {
  onRoomStarted?: (room: RoomSession) => unknown
  onRoomEnded?: (room: RoomSession) => unknown
}

export type RealTimeVideoListenersEventsMapping = {
  onRoomStarted: RoomStarted
  onRoomEnded: RoomEnded
}

/**
 * RealTime Video Room API
 */
// TODO: replace `any` with proper types.
export type RealTimeRoomApiEventsHandlerMapping = Record<
  VideoLayoutEventNames,
  (layout: any) => void
> &
  Record<
    Exclude<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (member: RoomSessionMember) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (member: RoomSessionMemberUpdated) => void
  > &
  Record<MemberTalkingEventNames, (member: RoomSessionMember) => void> &
  Record<RoomStarted | RoomEnded, (roomSession: RoomSession) => void> &
  Record<RoomUpdated, (roomSession: RoomSession) => void> &
  Record<
    RoomAudienceCount,
    (params: VideoRoomAudienceCountEventParams) => void
  > &
  Record<RoomSubscribed, (roomSessionFull: RoomSession) => void> &
  Rooms.RoomSessionRecordingEventsHandlerMapping &
  Rooms.RoomSessionPlaybackEventsHandlerMapping &
  Rooms.RoomSessionStreamEventsHandlerMapping

export type RealTimeRoomApiEvents = {
  [k in keyof RealTimeRoomApiEventsHandlerMapping]: RealTimeRoomApiEventsHandlerMapping[k]
}

export interface RealTimeRoomListeners {
  onRoomSubscribed?: (room: RoomSession) => unknown
  onRoomStarted?: (room: RoomSession) => unknown
  onRoomUpdated?: (room: RoomSession) => unknown
  onRoomEnded?: (room: RoomSession) => unknown
  onRoomAudienceCount?: (params: VideoRoomAudienceCountEventParams) => unknown
  onLayoutChanged?: (layout: any) => unknown
  onMemberJoined?: (member: RoomSessionMember) => unknown
  onMemberUpdated?: (member: RoomSessionMember) => unknown
  onMemberListUpdated?: (member: RoomSessionMember) => unknown
  onMemberLeft?: (member: RoomSessionMember) => unknown
  onMemberDeaf?: (member: RoomSessionMember) => unknown
  onMemberVisible?: (member: RoomSessionMember) => unknown
  onMemberAudioMuted?: (member: RoomSessionMember) => unknown
  onMemberVideoMuted?: (member: RoomSessionMember) => unknown
  onMemberInputVolume?: (member: RoomSessionMember) => unknown
  onMemberOutputVolume?: (member: RoomSessionMember) => unknown
  onMemberInputSensitivity?: (member: RoomSessionMember) => unknown
  onMemberTalking?: (member: RoomSessionMember) => unknown
  onMemberTalkingStarted?: (member: RoomSessionMember) => unknown
  onMemberTalkingEnded?: (member: RoomSessionMember) => unknown
  onPlaybackStarted?: (playback: RoomSessionPlayback) => unknown
  onPlaybackUpdated?: (playback: RoomSessionPlayback) => unknown
  onPlaybackEnded?: (playback: RoomSessionPlayback) => unknown
  onRecordingStarted?: (recording: RoomSessionRecording) => unknown
  onRecordingUpdated?: (recording: RoomSessionRecording) => unknown
  onRecordingEnded?: (recording: RoomSessionRecording) => unknown
  onStreamStarted?: (stream: RoomSessionStream) => unknown
  onStreamEnded?: (stream: RoomSessionStream) => unknown
}

type MemberUpdatedEventMapping = {
  [K in MemberUpdatedEventNames]: K
}

export type RealtimeRoomListenersEventsMapping = Record<
  OnRoomSubscribed,
  RoomSubscribed
> &
  Record<OnRoomStarted, RoomStarted> &
  Record<OnRoomUpdated, RoomUpdated> &
  Record<OnRoomEnded, RoomEnded> &
  Record<OnRoomAudienceCount, RoomAudienceCount> &
  Record<OnLayoutChanged, VideoLayoutEventNames> &
  Record<OnMemberJoined, MemberJoined> &
  Record<OnMemberUpdated, MemberUpdated> &
  Record<OnMemberLeft, MemberLeft> &
  Record<OnMemberListUpdated, MemberListUpdated> &
  Record<OnMemberTalking, MemberTalking> &
  Record<OnMemberTalkingStarted, MemberTalkingStarted> &
  Record<OnMemberTalkingEnded, MemberTalkingEnded> &
  Record<OnMemberDeaf, MemberUpdatedEventMapping['member.updated.deaf']> &
  Record<OnMemberVisible, MemberUpdatedEventMapping['member.updated.visible']> &
  Record<
    OnMemberAudioMuted,
    MemberUpdatedEventMapping['member.updated.audioMuted']
  > &
  Record<
    OnMemberVideoMuted,
    MemberUpdatedEventMapping['member.updated.videoMuted']
  > &
  Record<
    OnMemberInputVolume,
    MemberUpdatedEventMapping['member.updated.inputVolume']
  > &
  Record<
    OnMemberOutputVolume,
    MemberUpdatedEventMapping['member.updated.outputVolume']
  > &
  Record<
    OnMemberInputSensitivity,
    MemberUpdatedEventMapping['member.updated.inputSensitivity']
  > &
  Record<OnPlaybackStarted, PlaybackStarted> &
  Record<OnPlaybackUpdated, PlaybackUpdated> &
  Record<OnPlaybackEnded, PlaybackEnded> &
  Record<OnRecordingStarted, RecordingStarted> &
  Record<OnRecordingUpdated, RecordingUpdated> &
  Record<OnRecordingEnded, RecordingEnded> &
  Record<OnStreamStarted, StreamStarted> &
  Record<OnStreamEnded, StreamEnded>

/**
 * RealTime Room CallPlayback API
 */
export interface RealTimeRoomPlaybackListeners {
  onStarted?: (playback: RoomSessionPlayback) => unknown
  onUpdated?: (playback: RoomSessionPlayback) => unknown
  onEnded?: (playback: RoomSessionPlayback) => unknown
}

/**
 * RealTime Room CallRecording API
 */
export interface RealTimeRoomRecordingListeners {
  onStarted?: (recording: RoomSessionRecording) => unknown
  onUpdated?: (recording: RoomSessionRecording) => unknown
  onEnded?: (recording: RoomSessionRecording) => unknown
}

/**
 * RealTime Room CallStream API
 */
export interface RealTimeRoomStreamListeners {
  onStarted?: (stream: RoomSessionStream) => unknown
  onEnded?: (stream: RoomSessionStream) => unknown
}
