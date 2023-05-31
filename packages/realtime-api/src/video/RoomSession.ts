import {
  BaseComponentOptions,
  connect,
  extendComponent,
  InternalVideoMemberEventNames,
  Rooms,
  InternalVideoRoomSessionEventNames,
  VideoRoomAudienceCountEventNames,
  InternalVideoLayoutEventNames,
  InternalVideoRecordingEventNames,
  InternalVideoPlaybackEventNames,
  InternalVideoStreamEventNames,
  VideoRoomSessionContract,
  VideoRoomSessionMethods,
  ConsumerContract,
  EntityUpdated,
  BaseConsumer,
  EventEmitter,
  MemberPosition,
  debounce,
  VideoRoomEventParams,
  Optional,
} from '@signalwire/core'
import { RealTimeRoomApiEvents } from '../types'
import {
  RoomSessionMember,
  RoomSessionMemberEventParams,
  createRoomSessionMemberObject,
} from './RoomSessionMember'

type EmitterTransformsEvents =
  | InternalVideoRoomSessionEventNames
  | VideoRoomAudienceCountEventNames
  | InternalVideoMemberEventNames
  | InternalVideoLayoutEventNames
  | InternalVideoRecordingEventNames
  | 'video.__local__.recording.start'
  | InternalVideoPlaybackEventNames
  | 'video.__local__.playback.start'
  | InternalVideoStreamEventNames
  | 'video.__local__.stream.start'

export interface RoomSession
  extends VideoRoomSessionContract,
    ConsumerContract<RealTimeRoomApiEvents, RoomSessionFullState> {
  baseEmitter: EventEmitter
  setPayload(payload: Optional<VideoRoomEventParams, 'room'>): void
  /**
   * Returns a list of members currently in the room.
   *
   * @example
   * ```typescript
   * await room.getMembers()
   * ```
   */
  getMembers(): Rooms.GetMembers
}

export type RoomSessionUpdated = EntityUpdated<RoomSession>
export interface RoomSessionFullState extends Omit<RoomSession, 'members'> {
  /** List of members that are part of this room session */
  members?: RoomSessionMember[]
}

export class RoomSessionConsumer extends BaseConsumer<RealTimeRoomApiEvents> {
  protected _eventsPrefix = 'video' as const
  private _payload: Optional<VideoRoomEventParams, 'room'>

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

  /** @internal */
  private debouncedSubscribe: ReturnType<typeof debounce>

  constructor(options: BaseComponentOptions<RealTimeRoomApiEvents>) {
    super(options)

    if (options.payload) {
      this._payload = options.payload
    }

    this.debouncedSubscribe = debounce(this.subscribe, 100)
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

  get eventChannel() {
    return this._payload.room_session.event_channel
  }

  /** @internal */
  protected _internal_on(
    event: keyof RealTimeRoomApiEvents,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, any>
  ) {
    return super.on(event, fn)
  }

  on(
    event: keyof RealTimeRoomApiEvents,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, any>
  ) {
    // @ts-expect-error
    const instance = super._on(`video.${event}`, fn)
    this.debouncedSubscribe()
    return instance
  }

  once(
    event: keyof RealTimeRoomApiEvents,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, any>
  ) {
    // @ts-expect-error
    const instance = super._on(`video.${event}`, fn)
    this.debouncedSubscribe()
    return instance
  }

  off(
    event: keyof RealTimeRoomApiEvents,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, any>
  ) {
    // @ts-expect-error
    const instance = super.off(`video.${event}`, fn)
    return instance
  }

  /**
   * @privateRemarks
   *
   * Override BaseConsumer `subscribe` to resolve the promise when the 'room.subscribed'
   * event comes. This way we can return to the user the room full state.
   * Note: the payload will go through an EventTrasform - see the `type: roomSessionSubscribed`
   * below.
   */
  subscribe() {
    return new Promise(async (resolve, reject) => {
      const handler = (payload: RoomSessionFullState) => {
        resolve(payload)
      }
      const subscriptions = this.getSubscriptions()
      if (subscriptions.length === 0) {
        this.logger.debug(
          '`subscribe()` was called without any listeners attached.'
        )
        return
      }

      try {
        /**
         * Note that we're using `super.once` (instead of
         * `this.once`) here, because we don't want to
         * re-trigger our added custom behavior.
         */
        super.once('room.subscribed', handler)
        await super.subscribe()
      } catch (error) {
        super.off('room.subscribed', handler)
        return reject(error)
      }
    })
  }

  /** @internal */
  protected override getCompoundEvents() {
    return new Map<any, any>([
      ...MemberPosition.MEMBER_POSITION_COMPOUND_EVENTS,
    ])
  }

  /** @internal */
  protected setPayload(payload: Optional<VideoRoomEventParams, 'room'>) {
    this._payload = payload
  }

  getMembers() {
    return new Promise(async (resolve, reject) => {
      try {
        const { members } = await this.execute<
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
          let memberInstance = this.instanceMap.get<RoomSessionMember>(
            member.id
          )
          if (!memberInstance) {
            memberInstance = createRoomSessionMemberObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
              payload: { member },
            })
          } else {
            memberInstance.setPayload({
              member,
            } as RoomSessionMemberEventParams)
          }
          memberInstances.push(memberInstance)
          this.instanceMap.set<RoomSessionMember>(
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
  RoomSessionConsumer,
  VideoRoomSessionMethods
>(RoomSessionConsumer, {
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  deaf: Rooms.deafMember,
  undeaf: Rooms.undeafMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setOutputVolume: Rooms.setOutputVolumeMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
  removeMember: Rooms.removeMember,
  removeAllMembers: Rooms.removeAllMembers,
  setHideVideoMuted: Rooms.setHideVideoMuted,
  getLayouts: Rooms.getLayouts,
  setLayout: Rooms.setLayout,
  setPositions: Rooms.setPositions,
  setMemberPosition: Rooms.setMemberPosition,
  getRecordings: Rooms.getRTRecordings,
  startRecording: Rooms.startRTRecording,
  getPlaybacks: Rooms.getRTPlaybacks,
  play: Rooms.playRT,
  getMeta: Rooms.getMeta,
  setMeta: Rooms.setMeta,
  updateMeta: Rooms.updateMeta,
  deleteMeta: Rooms.deleteMeta,
  getMemberMeta: Rooms.getMemberMeta,
  setMemberMeta: Rooms.setMemberMeta,
  updateMemberMeta: Rooms.updateMemberMeta,
  deleteMemberMeta: Rooms.deleteMemberMeta,
  promote: Rooms.promote,
  demote: Rooms.demote,
  getStreams: Rooms.getRTStreams,
  startStream: Rooms.startRTStream,
})

export const createRoomSessionObject = (
  params: BaseComponentOptions<EmitterTransformsEvents>
): RoomSession => {
  const roomSession = connect<
    RealTimeRoomApiEvents,
    RoomSessionConsumer,
    RoomSession
  >({
    store: params.store,
    Component: RoomSessionAPI,
  })(params)

  return roomSession
}
