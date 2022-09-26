import {
  BaseComponentOptions,
  connect,
  EventTransform,
  extendComponent,
  InternalVideoMemberEventNames,
  INTERNAL_MEMBER_UPDATED_EVENTS,
  Rooms,
  toExternalJSON,
  toLocalEvent,
  VideoMemberEventParams,
  InternalVideoRoomSessionEventNames,
  VideoRoomAudienceCountEventNames,
  VideoRoomAudienceCountEventParams,
  VideoRoomUpdatedEventParams,
  VideoRoomSubscribedEventParams,
  InternalVideoLayoutEventNames,
  InternalVideoRecordingEventNames,
  InternalVideoPlaybackEventNames,
  InternalVideoStreamEventNames,
  VideoPlaybackEventParams,
  VideoLayoutChangedEventParams,
  VideoRoomSessionContract,
  VideoRoomSessionMethods,
  ConsumerContract,
  EntityUpdated,
  BaseConsumer,
  EventEmitter,
  MemberPosition,
  debounce,
} from '@signalwire/core'
import { RealTimeRoomApiEvents } from '../types'
import {
  createRoomSessionMemberObject,
  RoomSessionMember,
} from './RoomSessionMember'
import { memberPositionWorker } from './memberPosition/workers'

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
    ConsumerContract<RealTimeRoomApiEvents, RoomSessionFullState> {}

export type RoomSessionUpdated = EntityUpdated<RoomSession>
export interface RoomSessionFullState extends Omit<RoomSession, 'members'> {
  /** List of members that are part of this room session */
  members?: RoomSessionMember[]
}

export class RoomSessionConsumer extends BaseConsumer<RealTimeRoomApiEvents> {
  protected _eventsPrefix = 'video' as const

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

  /** @internal */
  private debouncedSubscribe: ReturnType<typeof debounce>

  constructor(options: BaseComponentOptions<RealTimeRoomApiEvents>) {
    super(options)

    this.debouncedSubscribe = debounce(this.subscribe, 100)
    this.runWorker('memberPositionWorker', {
      worker: memberPositionWorker,
    })
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
    const instance = super.on(event, fn)
    this.debouncedSubscribe()
    return instance
  }

  once(
    event: keyof RealTimeRoomApiEvents,
    fn: EventEmitter.EventListener<RealTimeRoomApiEvents, any>
  ) {
    const instance = super.once(event, fn)
    this.debouncedSubscribe()
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
  protected getEmitterTransforms() {
    return new Map<
      EmitterTransformsEvents | EmitterTransformsEvents[],
      EventTransform
    >([
      [
        'video.room.subscribed',
        {
          type: 'roomSessionSubscribed',
          instanceFactory: () => {
            return this
          },
          payloadTransform: (payload: VideoRoomSubscribedEventParams) => {
            return toExternalJSON(payload.room_session)
          },
          nestedFieldsToProcess: {
            members: {
              eventTransformType: 'roomSessionMember',
              processInstancePayload: (payload) => {
                return {
                  room_session_id: this.getStateProperty('roomSessionId'),
                  member: payload,
                }
              },
            },
            recordings: {
              eventTransformType: 'roomSessionRecording',
              processInstancePayload: (payload) => {
                return {
                  room_session_id: this.getStateProperty('roomSessionId'),
                  recording: payload,
                }
              },
            },
            streams: {
              eventTransformType: 'roomSessionStream',
              processInstancePayload: (payload) => {
                return {
                  room_session_id: this.getStateProperty('roomSessionId'),
                  stream: payload,
                }
              },
            },
          },
          getInstanceEventNamespace: (
            payload: VideoRoomSubscribedEventParams
          ) => {
            return payload.room_session.id
          },
          getInstanceEventChannel: (
            payload: VideoRoomSubscribedEventParams
          ) => {
            return payload.room_session.event_channel
          },
        },
      ],
      [
        [toLocalEvent<EmitterTransformsEvents>('video.recording.list')],
        {
          type: 'roomSessionRecordingList',
          instanceFactory: (_payload: any) => {
            return {}
          },
          payloadTransform: (payload: any) => {
            return payload
          },
          nestedFieldsToProcess: {
            recordings: {
              eventTransformType: 'roomSessionRecording',
              processInstancePayload: (payload) => {
                return {
                  room_session_id: this.getStateProperty('roomSessionId'),
                  recording: payload,
                }
              },
            },
          },
        },
      ],
      [
        [toLocalEvent<EmitterTransformsEvents>('video.playback.list')],
        {
          type: 'roomSessionPlaybackList',
          instanceFactory: (_payload: any) => {
            return {}
          },
          payloadTransform: (payload: any) => {
            return payload
          },
          nestedFieldsToProcess: {
            playbacks: {
              eventTransformType: 'roomSessionPlayback',
              processInstancePayload: (payload) => {
                return {
                  room_session_id: this.getStateProperty('roomSessionId'),
                  playback: payload,
                }
              },
            },
          },
        },
      ],
      [
        'video.room.updated',
        {
          type: 'roomSession',
          instanceFactory: () => {
            return this
          },
          payloadTransform: (payload: VideoRoomUpdatedEventParams) => {
            return toExternalJSON({
              ...payload.room_session,
              room_session_id: payload.room_session.id,
            })
          },
          getInstanceEventNamespace: (payload: VideoRoomUpdatedEventParams) => {
            return payload.room_session.id
          },
          getInstanceEventChannel: (payload: VideoRoomUpdatedEventParams) => {
            return payload.room_session.event_channel
          },
        },
      ],
      [
        'video.layout.changed',
        {
          type: 'roomSessionLayout',
          instanceFactory: () => {
            // TODO: Implement a Layout object when we have a better payload
            // from the backend
            return {}
          },
          payloadTransform: (payload: VideoLayoutChangedEventParams) => {
            return toExternalJSON(payload.layout)
          },
        },
      ],
      [
        [
          'video.member.joined',
          'video.member.left',
          'video.member.talking',
          'video.member.talking.start',
          'video.member.talking.started',
          'video.member.talking.stop',
          'video.member.talking.ended',
          'video.member.updated',
          ...INTERNAL_MEMBER_UPDATED_EVENTS,
        ],
        {
          type: 'roomSessionMember',
          instanceFactory: (_payload: VideoMemberEventParams) => {
            return createRoomSessionMemberObject({
              store: this.store,
              // TODO: the emitter is now typed so types
              // don't match but internally it doesn't
              // matter that much.
              // @ts-expect-error
              emitter: this.options.emitter,
            })
          },
          payloadTransform: (payload: VideoMemberEventParams) => {
            return toExternalJSON({
              ...payload.member,
              /**
               * The server is sending the member id as `id`
               * but internally (i.e in CustomMethods) we
               * reference it as `memberId`. This is needed
               * because sometimes we have to deal with
               * multiple ids at once and having them
               * properly prefixed makes it easier to read.
               */
              member_id: payload.member.id,
            })
          },
        },
      ],
      [
        [
          toLocalEvent<EmitterTransformsEvents>('video.recording.start'),
          'video.recording.started',
          'video.recording.updated',
          'video.recording.ended',
        ],
        {
          type: 'roomSessionRecording',
          instanceFactory: (_payload: any) => {
            return Rooms.createRoomSessionRecordingObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: any) => {
            return toExternalJSON({
              ...payload.recording,
              room_session_id: payload.room_session_id,
            })
          },
        },
      ],
      [
        [
          toLocalEvent<EmitterTransformsEvents>('video.playback.start'),
          'video.playback.started',
          'video.playback.updated',
          'video.playback.ended',
        ],
        {
          type: 'roomSessionPlayback',
          instanceFactory: (_payload: any) => {
            return Rooms.createRoomSessionPlaybackObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: VideoPlaybackEventParams) => {
            return toExternalJSON({
              ...payload.playback,
              room_session_id: payload.room_session_id,
            })
          },
        },
      ],
      [
        ['video.room.audience_count', 'video.room.audienceCount'],
        {
          type: 'roomSessionAudienceCount',
          instanceFactory: (_payload: VideoRoomAudienceCountEventParams) => {
            return {}
          },
          payloadTransform: (payload: VideoRoomAudienceCountEventParams) => {
            return toExternalJSON(payload)
          },
        },
      ],
      [
        [toLocalEvent<EmitterTransformsEvents>('video.stream.list')],
        {
          type: 'roomSessionStreamList',
          instanceFactory: (_payload: any) => {
            return {}
          },
          payloadTransform: (payload: any) => {
            return payload
          },
          nestedFieldsToProcess: {
            streams: {
              eventTransformType: 'roomSessionStream',
              processInstancePayload: (payload) => {
                return {
                  room_session_id: this.getStateProperty('roomSessionId'),
                  stream: payload,
                }
              },
            },
          },
        },
      ],
      [
        [
          toLocalEvent<EmitterTransformsEvents>('video.stream.start'),
          'video.stream.started',
          'video.stream.ended',
        ],
        {
          type: 'roomSessionStream',
          instanceFactory: (_payload: any) => {
            return Rooms.createRoomSessionStreamObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: any) => {
            return toExternalJSON({
              ...payload.stream,
              room_session_id: payload.room_session_id,
            })
          },
        },
      ],
    ])
  }
}

export const RoomSessionAPI = extendComponent<
  RoomSessionConsumer,
  VideoRoomSessionMethods
>(RoomSessionConsumer, {
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  getMembers: Rooms.getMembers,
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
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return roomSession
}
