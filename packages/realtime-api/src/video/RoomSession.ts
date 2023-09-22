import {
  extendComponent,
  Rooms,
  VideoRoomSessionMethods,
  EventEmitter,
  VideoRoomEventParams,
  Optional,
  validateEventsToSubscribe,
  VideoMemberEntity,
  VideoRoomSessionContract,
} from '@signalwire/core'
import {
  RealTimeRoomApiEvents,
  RealTimeRoomListeners,
  RealtimeRoomListenersEventsMapping,
} from '../types'
import {
  RoomSessionMember,
  RoomSessionMemberEventParams,
  createRoomSessionMemberObject,
} from './RoomSessionMember'
import { BaseVideo } from './BaseVideo'
import { Video } from './Video'

export interface RoomSessionFullState extends Omit<RoomSession, 'members'> {
  /** List of members that are part of this room session */
  members?: RoomSessionMember[]
}

export interface RoomSession
  extends VideoRoomSessionContract,
    BaseVideo<RealTimeRoomListeners, RealTimeRoomApiEvents> {
  /**
   * Returns a list of members currently in the room.
   *
   * @example
   * ```typescript
   * await room.getMembers()
   * ```
   */
  getMembers(): Promise<{ members: RoomSessionMember[] }>
  /** @internal */
  setPayload(payload: Optional<VideoRoomEventParams, 'room'>): void
}

type RoomSessionPayload = Optional<VideoRoomEventParams, 'room'>

interface RoomSessionOptions {
  video: Video
  payload: RoomSessionPayload
}

export class RoomSession extends BaseVideo<
  RealTimeRoomListeners,
  RealTimeRoomApiEvents
> {
  private _payload: RoomSessionPayload
  protected _subscribeParams = { get_initial_state: true }
  protected _eventMap: RealtimeRoomListenersEventsMapping = {
    onRoomSubscribed: 'room.subscribed',
    onRoomStarted: 'room.started',
    onRoomUpdated: 'room.updated',
    onRoomEnded: 'room.ended',
    onRoomAudienceCount: 'room.audienceCount',
    onLayoutChanged: 'layout.changed',
    onMemberJoined: 'member.joined',
    onMemberUpdated: 'member.updated',
    onMemberLeft: 'member.left',
    onMemberListUpdated: 'memberList.updated',
    onMemberTalking: 'member.talking',
    onMemberTalkingStarted: 'member.talking.started',
    onMemberTalkingEnded: 'member.talking.ended',
    onMemberDeaf: 'member.updated.deaf',
    onMemberVisible: 'member.updated.visible',
    onMemberAudioMuted: 'member.updated.audioMuted',
    onMemberVideoMuted: 'member.updated.videoMuted',
    onMemberInputVolume: 'member.updated.inputVolume',
    onMemberOutputVolume: 'member.updated.outputVolume',
    onMemberInputSensitivity: 'member.updated.inputSensitivity',
    onPlaybackStarted: 'playback.started',
    onPlaybackUpdated: 'playback.updated',
    onPlaybackEnded: 'playback.ended',
    onRecordingStarted: 'recording.started',
    onRecordingUpdated: 'recording.updated',
    onRecordingEnded: 'recording.ended',
    onStreamStarted: 'stream.started',
    onStreamEnded: 'stream.ended',
  }

  constructor(options: RoomSessionOptions) {
    super(options.video._sw)

    this._payload = options.payload
  }

  get id() {
    return this._payload.room_session.id
  }

  get roomSessionId() {
    return this._payload.room_session.id
  }

  get roomId() {
    return this._payload.room_session.room_id
  }

  get name() {
    return this._payload.room_session.name
  }

  get displayName() {
    return this._payload.room_session.display_name
  }

  get hideVideoMuted() {
    return this._payload.room_session.hide_video_muted
  }

  get layoutName() {
    return this._payload.room_session.layout_name
  }

  get meta() {
    return this._payload.room_session.meta
  }

  get previewUrl() {
    return this._payload.room_session.preview_url
  }

  get recording() {
    return this._payload.room_session.recording
  }

  get locked() {
    return this._payload.room_session.locked
  }

  get eventChannel() {
    return this._payload.room_session.event_channel
  }

  /** @internal */
  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map(
      (event) => `video.${String(event)}`
    ) as EventEmitter.EventNames<RealTimeRoomApiEvents>[]
    return validateEventsToSubscribe(eventNamesWithPrefix)
  }

  /** @internal */
  setPayload(payload: Optional<VideoRoomEventParams, 'room'>) {
    this._payload = payload
  }

  getMembers() {
    return new Promise<{
      members: VideoMemberEntity[]
    }>(async (resolve, reject) => {
      try {
        const { members } = await this._client.execute<
          void,
          { members: RoomSessionMemberEventParams['member'][] }
        >({
          method: 'video.members.get',
          params: {
            room_session_id: this.roomSessionId,
          },
        })

        const memberInstances: RoomSessionMember[] = []
        members.forEach((member) => {
          let memberInstance = this._client.instanceMap.get<RoomSessionMember>(
            member.id
          )
          if (!memberInstance) {
            memberInstance = createRoomSessionMemberObject({
              store: this._client.store,
              payload: {
                room_id: this.roomId,
                room_session_id: this.roomSessionId,
                member,
              },
            })
          } else {
            memberInstance.setPayload({
              member,
            } as RoomSessionMemberEventParams)
          }
          memberInstances.push(memberInstance)
          this._client.instanceMap.set<RoomSessionMember>(
            memberInstance.id,
            memberInstance
          )
        })

        resolve({ members: memberInstances })
      } catch (error) {
        reject(error)
      }
    })
  }
}

export const RoomSessionAPI = extendComponent<
  RoomSession,
  Omit<VideoRoomSessionMethods, 'getMembers'>
>(RoomSession, {
  videoMute: Rooms.RTMethods.videoMuteMember,
  videoUnmute: Rooms.RTMethods.videoUnmuteMember,
  audioMute: Rooms.RTMethods.audioMuteMember,
  audioUnmute: Rooms.RTMethods.audioUnmuteMember,
  deaf: Rooms.RTMethods.deafMember,
  undeaf: Rooms.RTMethods.undeafMember,
  setInputVolume: Rooms.RTMethods.setInputVolumeMember,
  setOutputVolume: Rooms.RTMethods.setOutputVolumeMember,
  setMicrophoneVolume: Rooms.RTMethods.setInputVolumeMember,
  setSpeakerVolume: Rooms.RTMethods.setOutputVolumeMember,
  setInputSensitivity: Rooms.RTMethods.setInputSensitivityMember,
  removeMember: Rooms.RTMethods.removeMember,
  removeAllMembers: Rooms.RTMethods.removeAllMembers,
  setHideVideoMuted: Rooms.RTMethods.setHideVideoMuted,
  getLayouts: Rooms.RTMethods.getLayouts,
  setLayout: Rooms.RTMethods.setLayout,
  setPositions: Rooms.RTMethods.setPositions,
  setMemberPosition: Rooms.RTMethods.setMemberPosition,
  getRecordings: Rooms.RTMethods.getRecordings,
  startRecording: Rooms.RTMethods.startRecording,
  getPlaybacks: Rooms.RTMethods.getPlaybacks,
  play: Rooms.RTMethods.play,
  getMeta: Rooms.RTMethods.getMeta,
  setMeta: Rooms.RTMethods.setMeta,
  updateMeta: Rooms.RTMethods.updateMeta,
  deleteMeta: Rooms.RTMethods.deleteMeta,
  getMemberMeta: Rooms.RTMethods.getMemberMeta,
  setMemberMeta: Rooms.RTMethods.setMemberMeta,
  updateMemberMeta: Rooms.RTMethods.updateMemberMeta,
  deleteMemberMeta: Rooms.RTMethods.deleteMemberMeta,
  promote: Rooms.RTMethods.promote,
  demote: Rooms.RTMethods.demote,
  getStreams: Rooms.RTMethods.getStreams,
  startStream: Rooms.RTMethods.startStream,
  // lock: Rooms.RTMethods.lock,
  // unlock: Rooms.RTMethods.unlock,
})
