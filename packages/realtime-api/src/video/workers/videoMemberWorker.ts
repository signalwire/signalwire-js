import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoMemberJoinedEvent,
  VideoMemberLeftEvent,
  VideoMemberUpdatedEvent,
  VideoMemberTalkingEvent,
  InternalVideoMemberUpdatedEvent,
  fromSnakeToCamelCase,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import {
  createRoomSessionMemberObject,
  RoomSessionMember,
  RoomSessionMemberEventParams,
} from '../RoomSessionMember'
import { VideoCallWorkerParams } from './videoCallingWorker'

type VideoMemberEvents = MapToPubSubShape<
  | VideoMemberJoinedEvent
  | VideoMemberLeftEvent
  | VideoMemberUpdatedEvent
  | VideoMemberTalkingEvent
  | InternalVideoMemberUpdatedEvent
>

export const videoMemberWorker = function* (
  options: VideoCallWorkerParams<VideoMemberEvents>
): SagaIterator {
  getLogger().trace('videoMemberWorker started')
  const {
    instance,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  const roomSessionInstance = get<RoomSession>(payload.room_session_id)
  if (!roomSessionInstance) {
    throw new Error('Missing room session instance for member')
  }

  let memberInstance = get<RoomSessionMember>(payload.member.id)
  if (!memberInstance) {
    memberInstance = createRoomSessionMemberObject({
      // @ts-expect-error
      store: instance.store,
      // @ts-expect-error
      emitter: instance.emitter,
      payload,
    })
  } else {
    memberInstance.setPayload(payload as RoomSessionMemberEventParams)
  }
  set<RoomSessionMember>(payload.member.id, memberInstance)

  if (type.startsWith('video.member.updated.')) {
    const clientType = fromSnakeToCamelCase(type)
    roomSessionInstance.baseEmitter.emit(clientType, memberInstance)
  }

  switch (type) {
    case 'video.member.joined':
    case 'video.member.updated':
      roomSessionInstance.baseEmitter.emit(type, memberInstance)
      break
    case 'video.member.left':
      roomSessionInstance.baseEmitter.emit(type, memberInstance)
      remove<RoomSessionMember>(payload.member.id)
      break
    case 'video.member.talking':
      if ('talking' in payload.member) {
        const suffix = payload.member.talking ? 'started' : 'ended'
        roomSessionInstance.baseEmitter.emit(
          `${type}.${suffix}`,
          memberInstance
        )
      }
      break
    default:
      break
  }

  getLogger().trace('videoMemberWorker ended')
}
