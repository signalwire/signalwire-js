import {
  extendComponent,
  VideoRoomSessionMethods,
  EventEmitter,
  VideoRoomEventParams,
  Optional,
  validateEventsToSubscribe,
  VideoMemberEntity,
} from '@signalwire/core'
import {
  RealTimeRoomEvents,
  RealTimeRoomListeners,
  RealtimeRoomListenersEventsMapping,
  VideoRoomSessionContract,
} from '../types'
import {
  RoomSessionMember,
  RoomSessionMemberAPI,
  RoomSessionMemberEventParams,
} from './RoomSessionMember'
import { RoomMethods } from './methods'
import { BaseVideo } from './BaseVideo'
import { Video } from './Video'

export interface RoomSessionFullState extends Omit<RoomSession, 'members'> {
  /** List of members that are part of this room session */
  members?: RoomSessionMember[]
}

export interface RoomSession
  extends VideoRoomSessionContract,
    BaseVideo<RealTimeRoomListeners, RealTimeRoomEvents> {
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

export interface RoomSessionOptions {
  video: Video
  payload: RoomSessionPayload
}

export class RoomSession extends BaseVideo<
  RealTimeRoomListeners,
  RealTimeRoomEvents
> {
  private _payload: RoomSessionPayload
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

  get streaming() {
    return this._payload.room_session.streaming
  }

  get locked() {
    return this._payload.room_session.locked
  }

  get eventChannel() {
    return this._payload.room_session.event_channel
  }

  get prioritizeHandraise() {
    return this._payload.room_session.prioritize_handraise
  }

  get updated() {
    // TODO: Fix type issue
    return this._payload.room_session
      .updated as VideoRoomSessionContract['updated']
  }

  /** @internal */
  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map(
      (event) => `video.${String(event)}`
    ) as EventEmitter.EventNames<RealTimeRoomEvents>[]
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
            memberInstance = new RoomSessionMemberAPI({
              roomSession: this,
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
  videoMute: RoomMethods.videoMuteMember,
  videoUnmute: RoomMethods.videoUnmuteMember,
  audioMute: RoomMethods.audioMuteMember,
  audioUnmute: RoomMethods.audioUnmuteMember,
  deaf: RoomMethods.deafMember,
  undeaf: RoomMethods.undeafMember,
  setInputVolume: RoomMethods.setInputVolumeMember,
  setOutputVolume: RoomMethods.setOutputVolumeMember,
  setMicrophoneVolume: RoomMethods.setInputVolumeMember,
  setSpeakerVolume: RoomMethods.setOutputVolumeMember,
  setInputSensitivity: RoomMethods.setInputSensitivityMember,
  removeMember: RoomMethods.removeMember,
  removeAllMembers: RoomMethods.removeAllMembers,
  setHideVideoMuted: RoomMethods.setHideVideoMuted,
  getLayouts: RoomMethods.getLayouts,
  setLayout: RoomMethods.setLayout,
  setPositions: RoomMethods.setPositions,
  setMemberPosition: RoomMethods.setMemberPosition,
  getRecordings: RoomMethods.getRecordings,
  startRecording: RoomMethods.startRecording,
  getPlaybacks: RoomMethods.getPlaybacks,
  play: RoomMethods.play,
  getMeta: RoomMethods.getMeta,
  setMeta: RoomMethods.setMeta,
  updateMeta: RoomMethods.updateMeta,
  deleteMeta: RoomMethods.deleteMeta,
  getMemberMeta: RoomMethods.getMemberMeta,
  setMemberMeta: RoomMethods.setMemberMeta,
  updateMemberMeta: RoomMethods.updateMemberMeta,
  deleteMemberMeta: RoomMethods.deleteMemberMeta,
  promote: RoomMethods.promote,
  demote: RoomMethods.demote,
  getStreams: RoomMethods.getStreams,
  startStream: RoomMethods.startStream,
  lock: RoomMethods.lock,
  unlock: RoomMethods.unlock,
  setRaisedHand: RoomMethods.setRaisedHand,
  setPrioritizeHandraise: RoomMethods.setPrioritizeHandraise,
})
