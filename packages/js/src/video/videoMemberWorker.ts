import {
  InternalVideoMemberUpdatedEvent,
  MapToPubSubShape,
  MemberTalkingEventNames,
  RoomSessionMember,
  Rooms,
  SagaIterator,
  VideoMemberEventNames,
  VideoMemberJoinedEvent,
  VideoMemberLeftEvent,
  VideoMemberTalkingEvent,
  VideoMemberUpdatedEvent,
  getLogger,
  stripNamespacePrefix,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'

type VideoMemberEvents = MapToPubSubShape<
  | VideoMemberJoinedEvent
  | VideoMemberLeftEvent
  | VideoMemberUpdatedEvent
  | VideoMemberTalkingEvent
  | InternalVideoMemberUpdatedEvent
>

type VideoMemberWorkerOptions = VideoWorkerParams<VideoMemberEvents>

export const videoMemberWorker = function* (
  options: VideoMemberWorkerOptions
): SagaIterator {
  getLogger().trace('videoMemberWorker started')
  const {
    instance: roomSession,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map
  let memberId = payload.member?.id

  if ('member_id' in payload.member) {
    memberId = payload.member?.member_id!
  }

  let memberInstance = get<RoomSessionMember>(memberId!)
  if (!memberInstance) {
    memberInstance = Rooms.createRoomSessionMemberObject({
      store: roomSession.store,
      payload: payload as Rooms.RoomSessionMemberEventParams,
    })
  } else {
    memberInstance.setPayload(payload as Rooms.RoomSessionMemberEventParams)
  }
  set<RoomSessionMember>(memberId!, memberInstance)

  const event = stripNamespacePrefix(type) as VideoMemberEventNames

  if (type.startsWith('video.member.updated.')) {
    roomSession.emit(event, payload)
  }

  switch (type) {
    case 'video.member.joined':
    case 'video.member.updated':
      roomSession.emit(event, payload)
      break
    case 'video.member.left':
      roomSession.emit(event, payload)
      remove<RoomSessionMember>(memberId!)
      break
    case 'video.member.talking':
      roomSession.emit(event, payload)
      if ('talking' in payload.member) {
        const suffix = payload.member.talking ? 'started' : 'ended'
        roomSession.emit(
          `${event}.${suffix}` as MemberTalkingEventNames,
          payload
        )

        // Keep for backwards compatibility
        const deprecatedSuffix = payload.member.talking ? 'start' : 'stop'
        roomSession.emit(
          `${event}.${deprecatedSuffix}` as MemberTalkingEventNames,
          payload
        )
      }
      break
    default:
      break
  }
  getLogger().trace('videoMemberWorker ended')
}
