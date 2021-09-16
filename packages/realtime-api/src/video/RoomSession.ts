import {
  BaseComponentOptions,
  connect,
  EventTransform,
  extendComponent,
  InternalVideoMemberEventNames,
  INTERNAL_MEMBER_UPDATED_EVENTS,
  Rooms,
  toExternalJSON,
  VideoMemberEventParams,
  InternalVideoRoomSessionEventNames,
  VideoRoomUpdatedEventParams,
  InternalVideoLayoutEventNames,
  InternalVideoRecordingEventNames,
  VideoLayoutChangedEventParams,
  VideoRoomSessionContract,
  VideoRoomSessionMethods,
  ConsumerContract,
  EntityUpdated,
} from '@signalwire/core'
import { BaseConsumer } from '../BaseConsumer'
import { RealTimeRoomApiEvents } from '../types'
import { createRoomSessionMemberObject } from './RoomSessionMember'

type EmitterTransformsEvents =
  | InternalVideoRoomSessionEventNames
  | InternalVideoMemberEventNames
  | InternalVideoLayoutEventNames
  | InternalVideoRecordingEventNames
  | 'video.__internal__.recording.start'

/**
 * Represents a room session. You can obtain instances of this class by
 * subscribing to the appropriate events from {@link Video}.
 *
 * You can use this object to subscribe to the following events.
 *
 * #### Room events
 *
 * **room.started**,<br>  
 * **room.ended**<br>  
 * Emitted when the room session is, respectively, started or ended.  Your event
 * handler receives an object which is an instance of {@link RoomSession}.
 *
 * **recording.started**,<br>  
 * **recording.updated**,<br>  
 * **recording.ended**<br>  
 * Emitted when a recording is, respectively, started, updated, or ended. Your
 * event handler receives an object which is an instance of
 * {@link RoomSessionRecording}.
 *
 * **layout.changed**<br>  
 * Emitted when the layout of the room changes. Your event handler receives an
 * object which is an instance of {@link RoomSessionRecording}.
 *
 * **room.updated**<br>  
 * Emitted when a property of the room is updated. Your event handler receives
 * an object which is an instance of {@link RoomSessionRecording}.
 *
 * #### Member events
 *
 * **member.joined**<br>  
 * Emitted when a member joins the room. Your event handler receives an object
 * of type {@link RoomSessionMember}.
 *
 * **member.left**<br>  
 * Emitted when a member leaves the room. Your event handler receives an object
 * of type {@link RoomSessionMember}.
 *
 * **member.talking**<br>  
 * Emitted when a member starts or stops talking. Your event handler receives an
 * object of type {@link RoomSessionMember}.
 *
 * **member.talking.started**<br>  
 * Emitted when a member starts talking. Your event handler receives an object
 * of type {@link RoomSessionMember}.
 *
 * **member.talking.ended**<br>  
 * Emitted when a member stops talking. Your event handler receives an object of
 * type {@link RoomSessionMember}.
 *
 * **member.updated**<br>  
 * Emitted when any property of one of the members is updated. Your event
 * handler receives an object `member` of type {@link RoomSessionMember}. Use
 * `member.updated` to access the list of updated properties. Example:
 * ```typescript
 * room.on('member.updated', (member) => {
 *     console.log(member.updated)
 *     // [ 'audioMuted' ]
 * }
 * ```
 *
 * **member.updated.audioMuted**,<br>  
 * **member.updated.videoMuted**,<br>  
 * **member.updated.deaf**,<br>  
 * **member.updated.onHold**,<br>  
 * **member.updated.visible**,<br>  
 * **member.updated.inputVolume**,<br>  
 * **member.updated.outputVolume**,<br>  
 * **member.updated.inputSensitivity**<br>  
 * Each of the above events is emitted when the associated property changes.
 * Your event handler receives an object `member` of type
 * {@link RoomSessionMember}.
 *
 *
 */
export interface RoomSession
  extends VideoRoomSessionContract,
    ConsumerContract<RealTimeRoomApiEvents> {}
export type RoomSessionUpdated = EntityUpdated<RoomSession>

class RoomSessionConsumer extends BaseConsumer<RealTimeRoomApiEvents> {
  protected _eventsPrefix = 'video' as const

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<
      EmitterTransformsEvents | EmitterTransformsEvents[],
      EventTransform
    >([
      [
        'video.room.updated',
        {
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
          'video.__internal__.recording.start',
          'video.recording.started',
          'video.recording.updated',
          'video.recording.ended',
        ],
        {
          instanceFactory: (_payload: any) => {
            return Rooms.createRoomSessionRecordingObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.emitter,
            })
          },
          payloadTransform: (payload: any) => {
            if (payload?.recording) {
              return toExternalJSON({
                ...payload.recording,
                room_session_id: payload.room_session_id,
              })
            }
            return {
              id: payload.recording_id,
              roomSessionId: payload.room_session_id,
            }
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
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
  removeMember: Rooms.removeMember,
  setHideVideoMuted: Rooms.setHideVideoMuted,
  getLayouts: Rooms.getLayouts,
  setLayout: Rooms.setLayout,
  getRecordings: Rooms.getRecordings,
  startRecording: Rooms.startRecording,
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
