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

export const videoMemberWorker = function* (
  options: VideoWorkerParams<VideoMemberEvents>
): SagaIterator {
  getLogger().trace('videoMemberWorker started')
  const {
    instance: roomSession,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  let memberInstance = get<RoomSessionMember>(payload.member?.member_id!)
  if (!memberInstance) {
    memberInstance = Rooms.createRoomSessionMemberObject({
      store: roomSession.store,
      payload: payload as Rooms.RoomSessionMemberEventParams,
    })
  } else {
    memberInstance.setPayload(payload as Rooms.RoomSessionMemberEventParams)
  }
  set<RoomSessionMember>(payload.member?.member_id!, memberInstance)

  const currentCallSegment =
    roomSession.callSegments[roomSession.callSegments.length - 1]

  /**
   * If the incoming event is for the self member
   * Send the payload with a member id from the first call segment for a consistent member id
   */
  if (payload.member.member_id === currentCallSegment.memberId) {
    memberInstance = {
      ...memberInstance,
      id: roomSession.callSegments[0].memberId,
      memberId: roomSession.callSegments[0].memberId,
    }
  }

  const event = stripNamespacePrefix(type) as VideoMemberEventNames

  if (type.startsWith('video.member.updated.')) {
    roomSession.emit(event, memberInstance)
  }

  switch (type) {
    case 'video.member.joined':
    case 'video.member.updated':
      roomSession.emit(event, memberInstance)
      break
    case 'video.member.left':
      roomSession.emit(event, memberInstance)
      remove<RoomSessionMember>(payload.member.id)
      break
    case 'video.member.talking':
      roomSession.emit(event, memberInstance)
      if ('talking' in payload.member) {
        const suffix = payload.member.talking ? 'started' : 'ended'
        roomSession.emit(
          `${event}.${suffix}` as MemberTalkingEventNames,
          memberInstance
        )

        // Keep for backwards compatibility
        const deprecatedSuffix = payload.member.talking ? 'start' : 'stop'
        roomSession.emit(
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
