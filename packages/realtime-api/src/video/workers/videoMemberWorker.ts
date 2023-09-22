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
  stripNamespacePrefix,
  VideoMemberEventNames,
  MemberTalkingEventNames,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import {
  RoomSessionMember,
  RoomSessionMemberAPI,
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
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  const roomSessionInstance = get<RoomSession>(payload.room_session_id)
  if (!roomSessionInstance) {
    throw new Error('Missing room session instance for member')
  }

  let memberInstance = get<RoomSessionMember>(payload.member.id)
  if (!memberInstance) {
    memberInstance = new RoomSessionMemberAPI({
      roomSession: roomSessionInstance,
      payload: payload as RoomSessionMemberEventParams,
    })
  } else {
    memberInstance.setPayload(payload as RoomSessionMemberEventParams)
  }
  set<RoomSessionMember>(payload.member.id, memberInstance)

  const event = stripNamespacePrefix(type) as VideoMemberEventNames

  if (type.startsWith('video.member.updated.')) {
    const clientType = fromSnakeToCamelCase(event)
    // @ts-expect-error
    roomSessionInstance.emit(clientType, memberInstance)
  }

  switch (type) {
    case 'video.member.joined':
    case 'video.member.updated':
      roomSessionInstance.emit(event, memberInstance)
      break
    case 'video.member.left':
      roomSessionInstance.emit(event, memberInstance)
      remove<RoomSessionMember>(payload.member.id)
      break
    case 'video.member.talking':
      roomSessionInstance.emit(event, memberInstance)
      if ('talking' in payload.member) {
        const suffix = payload.member.talking ? 'started' : 'ended'
        roomSessionInstance.emit(
          `${event}.${suffix}` as MemberTalkingEventNames,
          memberInstance
        )

        // Keep for backwards compatibility
        const deprecatedSuffix = payload.member.talking ? 'start' : 'stop'
        roomSessionInstance.emit(
          `${event}.${deprecatedSuffix}` as MemberTalkingEventNames,
          memberInstance
        )
      }
      break
    default:
      break
  }

  getLogger().trace('videoMemberWorker ended')
}
