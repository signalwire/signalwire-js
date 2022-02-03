import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  toSyntheticEvent,
  validateEventsToSubscribe,
  toInternalEventName,
  PubSubChannel,
  InternalVideoMemberEntity,
  InternalVideoMemberUpdatedEvent,
  VideoMemberJoinedEvent,
  VideoMemberLeftEvent,
  VideoMemberUpdatedEvent,
  InternalVideoRoomJoinedEvent,
  MapToPubSubShape,
} from '@signalwire/core'
import type { RoomSession } from '../RoomSession'
import type { VideoMemberListUpdatedParams } from '../utils/interfaces'

const noop = () => {}

const EXTERNAL_MEMBER_LIST_UPDATED_EVENT = 'video.memberList.updated'

const INTERNAL_MEMBER_LIST_UPDATED_EVENT = toInternalEventName({
  event: EXTERNAL_MEMBER_LIST_UPDATED_EVENT,
})

const SYNTHETIC_MEMBER_LIST_UPDATED_EVENT = toSyntheticEvent(
  INTERNAL_MEMBER_LIST_UPDATED_EVENT
)

/**
 * List of action types this worker cares about.
 */
type MemberListUpdatedTargetActions = MapToPubSubShape<
  | InternalVideoRoomJoinedEvent
  | InternalVideoMemberUpdatedEvent
  | VideoMemberJoinedEvent
  | VideoMemberLeftEvent
  | VideoMemberUpdatedEvent
>

const MEMBER_LIST_EVENTS: Array<MemberListUpdatedTargetActions['type']> = [
  /** Alias to `video.room.subscribed` */
  'video.room.joined',
  'video.member.joined',
  'video.member.left',
  'video.member.updated',
]

type MemberList = Map<string, InternalVideoMemberEntity>

const isMemberListEvent = (
  event: string
): event is MemberListUpdatedTargetActions['type'] => {
  // @ts-expect-error
  return MEMBER_LIST_EVENTS.includes(event)
}

const getMemberListEventsToSubscribe = (subscriptions: MemberListUpdatedTargetActions['type'][]) => {
  return validateEventsToSubscribe(MEMBER_LIST_EVENTS).filter((event) => {
    return !subscriptions.includes(event)
  })
}

const shouldHandleMemberList = (subscriptions: string[]) => {
  return subscriptions.some((event) =>
    event.includes(INTERNAL_MEMBER_LIST_UPDATED_EVENT)
  )
}

const getMembersFromAction = (action: MemberListUpdatedTargetActions) => {
  if (action.type === 'video.room.joined') {
    return action.payload.room_session.members
  }

  return [action.payload.member]
}

export const getUpdatedMembers = ({
  action,
  memberList,
}: {
  action: MemberListUpdatedTargetActions
  memberList: MemberList
}) => {
  const actionMembers = getMembersFromAction(action)

  switch (action.type) {
    case 'video.member.left':
      actionMembers.forEach((member: InternalVideoMemberEntity) => {
        memberList.delete(member.id)
      })
      break
    default:
      actionMembers.forEach((member: InternalVideoMemberEntity) => {
        memberList.set(member.id, member)
      })
  }

  return Array.from(memberList.values())
}

const initMemberListSubscriptions = (
  room: RoomSession,
  subscriptions: MemberListUpdatedTargetActions['type'][]
) => {
  const events = getMemberListEventsToSubscribe(subscriptions)

  events.forEach((event) => {
    /**
     * Params to `subscribe` come from the event handlers
     * the user has attached so to make sure we subscribe to
     * all the appropiate events needed for
     * `memberList.updated` to work, we must subscribe to
     * the required events. We don't need to act upon the
     * event (that's why we attach a `noop`), just to
     * register it (`subscribe` gets its values from
     * `BaseComponent.getSubscriptions`, which gets
     * populated by each of the  event handlers the user
     * attached).
     */
    room.once(event as any, noop)
  })

  /**
   * This handler will act as a simple bridge between
   * synthetic events and external events.
   */
  const eventBridgeHandler = ({ members }: VideoMemberListUpdatedParams) => {
    // @ts-expect-error
    room.emit(EXTERNAL_MEMBER_LIST_UPDATED_EVENT, { members })
  }

  // @ts-expect-error
  room.on(SYNTHETIC_MEMBER_LIST_UPDATED_EVENT, eventBridgeHandler)

  /**
   * Any events attached by the saga should be specified
   * here so it can be cleaned up when needed.
   */
  const cleanup = () => {
    // @ts-expect-error
    room.off(SYNTHETIC_MEMBER_LIST_UPDATED_EVENT, eventBridgeHandler)
  }

  return {
    cleanup,
  }
}

function* membersListUpdatedWatcher({
  pubSubChannel,
}: {
  pubSubChannel: PubSubChannel
}): SagaIterator {
  const memberList: MemberList = new Map()

  function* worker(pubSubAction: MemberListUpdatedTargetActions) {
    const roomSessionId =
      pubSubAction.type === 'video.room.joined'
        ? pubSubAction.payload.room_session.id
        : pubSubAction.payload.room_session_id

    const members = getUpdatedMembers({ action: pubSubAction, memberList })
    const memberListPayload = {
      /**
       * At this point it's needed to send the
       * `room_session_id` so the pubSubSaga can properly
       * infer the namespace for emitting the events to the
       * appropiate room.
       */
      room_session_id: roomSessionId,
      members,
    }

    // TODO: add typings
    yield sagaEffects.put(pubSubChannel, {
      type: SYNTHETIC_MEMBER_LIST_UPDATED_EVENT as any,
      payload: memberListPayload as any,
    })
  }

  while (true) {
    const pubSubAction: MemberListUpdatedTargetActions = yield sagaEffects.take(
      pubSubChannel,
      ({ type }: any) => {
        return isMemberListEvent(type)
      }
    )

    yield sagaEffects.fork(worker, pubSubAction)
  }
}

export const memberListUpdatedWorker: SDKWorker<RoomSession> =
  function* membersChangedWorker({
    channels: { pubSubChannel },
    instance,
  }): SagaIterator {
    // @ts-expect-error
    const subscriptions = instance.getSubscriptions()

    if (!shouldHandleMemberList(subscriptions)) {
      return
    }

    const { cleanup } = initMemberListSubscriptions(instance, subscriptions)

    yield sagaEffects.fork(membersListUpdatedWatcher, {
      pubSubChannel,
    })

    instance.once('destroy', () => {
      cleanup()
    })
  }
