import {
  InternalVideoMemberUpdatedEvent,
  MapToPubSubShape,
  MemberTalkingEventNames,
  RoomSessionMember,
  Rooms,
  SagaIterator,
  VideoMemberEventNames,
  VideoMemberJoinedEvent,
  VideoMemberJoinedEventParams,
  VideoMemberLeftEvent,
  VideoMemberLeftEventParams,
  VideoMemberTalkingEvent,
  VideoMemberTalkingEventParams,
  VideoMemberUpdatedEvent,
  VideoMemberUpdatedEventParams,
  getLogger,
  stripNamespacePrefix,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'
import { isUnifedJWTSession } from '../UnifiedJWTSession'

type VideoMemberEventsParams =
  | VideoMemberJoinedEventParams
  | VideoMemberLeftEventParams
  | VideoMemberUpdatedEventParams
  | VideoMemberTalkingEventParams

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
    getSession,
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  //@ts-ignore in unified context id => member_id
  let memberInstance = get<RoomSessionMember>(payload.member.member_id)
  if (!memberInstance) {
    memberInstance = Rooms.createRoomSessionMemberObject({
      store: roomSession.store,
      payload: payload as Rooms.RoomSessionMemberEventParams,
    })
  } else {
    memberInstance.setPayload(payload as Rooms.RoomSessionMemberEventParams)
  }
  //@ts-ignore in unified context id => member_id
  set<RoomSessionMember>(payload.member.member_id, memberInstance)

  /**
   * overide the member id on the event to always match the id
   * in the first call segment
   * @param payload
   * @param memberInstance
   * @returns
   */
  const toConsistentMemberEvent = (
    payload: VideoMemberEventsParams
  ): Rooms.RoomSessionMemberEventParams => {
    const session = getSession()
    if (isUnifedJWTSession(session)) {
      if (session.isASelfInstance(memberInstance.id)) {
        const executeSelf = session.getExcuteSelf()
        return {
          ...payload,
          member: {
            //@ts-ignore
            ...memberInstance._payload.member,
            id: executeSelf.memberId,
            member_id: executeSelf.memberId,
          },
        }
      }
    }
    return {
      ...payload,
      member: {
        //@ts-ignore
        ...memberInstance._payload.member,
        id: memberInstance.id,
      },
    }
  }

  const event = stripNamespacePrefix(type) as VideoMemberEventNames

  if (type.startsWith('video.member.updated.')) {
    roomSession.emit(event, toConsistentMemberEvent(payload))
  }

  switch (type) {
    case 'video.member.joined':
    case 'video.member.updated':
      roomSession.emit(event, toConsistentMemberEvent(payload))
      break
    case 'video.member.left':
      roomSession.emit(event, toConsistentMemberEvent(payload))
      remove<RoomSessionMember>(payload.member.id)
      break
    case 'video.member.talking':
      roomSession.emit(event, toConsistentMemberEvent(payload))
      if ('talking' in payload.member) {
        const suffix = payload.member.talking ? 'started' : 'ended'
        roomSession.emit(
          `${event}.${suffix}` as MemberTalkingEventNames,
          toConsistentMemberEvent(payload)
        )

        // Keep for backwards compatibility
        const deprecatedSuffix = payload.member.talking ? 'start' : 'stop'
        roomSession.emit(
          `${event}.${deprecatedSuffix}` as MemberTalkingEventNames,
          toConsistentMemberEvent(payload)
        )
      }
      break
    default:
      break
  }
  getLogger().trace('videoMemberWorker ended')
}
