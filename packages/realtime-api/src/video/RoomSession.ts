import {
  BaseComponentOptionsWithPayload,
  connect,
  extendComponent,
  Rooms,
  VideoRoomSessionContract,
  VideoRoomSessionMethods,
  ConsumerContract,
  EntityUpdated,
  BaseConsumer,
  EventEmitter,
  debounce,
  VideoRoomEventParams,
  Optional,
  validateEventsToSubscribe,
} from '@signalwire/core'
import { RealTimeRoomApiEvents } from '../types'
import {
  RoomSessionMember,
  RoomSessionMemberEventParams,
  createRoomSessionMemberObject,
} from './RoomSessionMember'

export interface RoomSession
  extends VideoRoomSessionContract,
    ConsumerContract<RealTimeRoomApiEvents, RoomSessionFullState> {
  setPayload(payload: Optional<VideoRoomEventParams, 'room'>): void
  /**
   * Returns a list of members currently in the room.
   *
   * @example
   * ```typescript
   * await room.getMembers()
   * ```
   */
  getMembers(): Promise<{ members: RoomSessionMember[] }>
}

export type RoomSessionUpdated = EntityUpdated<RoomSession>
export interface RoomSessionFullState extends Omit<RoomSession, 'members'> {
  /** List of members that are part of this room session */
  members?: RoomSessionMember[]
}

type RoomSessionPayload = Optional<VideoRoomEventParams, 'room'>
export interface RoomSessionConsumerOptions
  extends BaseComponentOptionsWithPayload<RoomSessionPayload> {}

export class RoomSessionConsumer extends BaseConsumer<RealTimeRoomApiEvents> {
  private _payload: RoomSessionPayload

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

  /** @internal */
  private debouncedSubscribe: ReturnType<typeof debounce>

  constructor(options: RoomSessionConsumerOptions) {
    super(options)

    this._payload = options.payload

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

  get locked() {
    return this._payload.room_session.locked
  }

  get eventChannel() {
    return this._payload.room_session.event_channel
  }

  get prioritizeHandraise() {
    return this._payload.room_session.prioritize_handraise
  }

  /** @internal */
  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map(
      (event) => `video.${String(event)}`
    ) as EventEmitter.EventNames<RealTimeRoomApiEvents>[]
    return validateEventsToSubscribe(eventNamesWithPrefix)
  }

  /** @internal */
  protected _internal_on(
    event: keyof RealTimeRoomApiEvents,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, any>
  ) {
    return super.on(event, fn)
  }

  on<T extends keyof RealTimeRoomApiEvents>(
    event: T,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, T>
  ) {
    const instance = super.on(event, fn)
    this.debouncedSubscribe()
    return instance
  }

  once<T extends keyof RealTimeRoomApiEvents>(
    event: T,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, T>
  ) {
    const instance = super.once(event, fn)
    this.debouncedSubscribe()
    return instance
  }

  off<T extends keyof RealTimeRoomApiEvents>(
    event: T,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, T>
  ) {
    const instance = super.off(event, fn)
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
        super.once('room.subscribed', handler)
        await super.subscribe()
      } catch (error) {
        super.off('room.subscribed', handler)
        return reject(error)
      }
    })
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
  Omit<VideoRoomSessionMethods, 'getMembers'>
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
  getRecordings: Rooms.getRecordings,
  startRecording: Rooms.startRecording,
  getPlaybacks: Rooms.getPlaybacks,
  play: Rooms.play,
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
  getStreams: Rooms.getStreams,
  startStream: Rooms.startStream,
  lock: Rooms.lock,
  unlock: Rooms.unlock,
  setRaisedHand: Rooms.setRaisedHand,
  setPrioritizeHandraise: Rooms.setPrioritizeHandraise,
})

export const createRoomSessionObject = (
  params: RoomSessionConsumerOptions
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
