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
  getLogger().debug('videoMemberWorker started', options.action.type ,options.action.payload)
  const {
    instance: roomSession,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  const memberId = payload.member?.id || payload.member?.member_id

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

  /**
   * If the incoming event is for the self member
   * Send the payload with a member id from the first call segment for a consistent member id
   */
  let newPayload = { ...payload }
  const currentCallSegment =
    roomSession.callSegments[roomSession.callSegments.length - 1]
  if (payload.member.member_id === currentCallSegment.memberId) {
    // FIXME: We should emit the RoomSessionMember instance
    // @ts-expect-error
    newPayload = {
      ...payload,
      member: {
        ...payload.member,
        id: roomSession.callSegments[0].memberId,
        member_id: roomSession.callSegments[0].memberId,
      },
    }
  }

  const event = stripNamespacePrefix(type) as VideoMemberEventNames

  if (type.startsWith('video.member.updated.')) {
    roomSession.emit(event, newPayload)
  }

  switch (type) {
    case 'video.member.joined':
    case 'video.member.updated':
      roomSession.emit(event, newPayload)
      break
    case 'video.member.left':
      roomSession.emit(event, newPayload)
      remove<RoomSessionMember>(memberId!)
      break
    case 'video.member.talking':
      roomSession.emit(event, newPayload)
      if ('talking' in payload.member) {
        const suffix = payload.member.talking ? 'started' : 'ended'
        roomSession.emit(
          `${event}.${suffix}` as MemberTalkingEventNames,
          newPayload
        )

        // Keep for backwards compatibility
        const deprecatedSuffix = payload.member.talking ? 'start' : 'stop'
        roomSession.emit(
          `${event}.${deprecatedSuffix}` as MemberTalkingEventNames,
          newPayload
        )
      }
      break
    default:
      break
  }
  getLogger().debug('videoMemberWorker ended')
}
