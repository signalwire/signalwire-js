import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  toSyntheticEvent,
  validateEventsToSubscribe,
  toInternalEventName,
  PubSubChannel,
  InternalVideoMemberEntity,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'

const noop = () => {}

const EXTERNAL_MEMBER_LIST_UPDATED_EVENT = 'video.memberList.updated'

const INTERNAL_MEMBER_LIST_UPDATED_EVENT = toInternalEventName({
  event: EXTERNAL_MEMBER_LIST_UPDATED_EVENT,
})

const SYNTHETIC_MEMBER_LIST_UPDATED_EVENT = toSyntheticEvent(
  INTERNAL_MEMBER_LIST_UPDATED_EVENT
)

const MEMBER_LIST_EVENTS = [
  /** Alias to `video.room.subscribed` */
  'video.room.joined',
  'video.member.joined',
  'video.member.left',
  'video.member.updated',
]

type MemberList = Map<string, InternalVideoMemberEntity>

const isMemberListEvent = (event: string) => {
  return MEMBER_LIST_EVENTS.includes(event)
}

const getMemberListEventsToSubscribe = (subscriptions: string[]) => {
  return validateEventsToSubscribe(MEMBER_LIST_EVENTS).filter((event) => {
    return !subscriptions.includes(event as string)
  })
}

const shouldHandleMemberList = (subscriptions: string[]) => {
  return subscriptions.some((event) =>
    event.includes(INTERNAL_MEMBER_LIST_UPDATED_EVENT)
  )
}

const getMembersFromAction = (action: any) => {
  if (action.type === 'video.room.joined') {
    return action.payload.room_session.members
  }

  return [action.payload.member]
}

const getUpdatedMembers = ({
  action,
  memberList,
}: {
  action: any
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
  subscriptions: string[]
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
  const eventBridgeHandler = (payload: any) => {
    // @ts-expect-error
    room.emit(EXTERNAL_MEMBER_LIST_UPDATED_EVENT, payload)
  }

  room.on(SYNTHETIC_MEMBER_LIST_UPDATED_EVENT as any, eventBridgeHandler)

  /**
   * Any events attached by the saga should be specified
   * here so it can be cleaned up when needed.
   */
  const cleanup = () => {
    room.off(SYNTHETIC_MEMBER_LIST_UPDATED_EVENT as any, eventBridgeHandler)
  }

  const memberList: MemberList = new Map()

  return {
    cleanup,
    memberList,
  }
}

function* membersListUpdatedWatcher({
  pubSubChannel,
  memberList,
}: {
  pubSubChannel: PubSubChannel
  memberList: MemberList
}): SagaIterator {
  function* worker(pubSubAction: any) {
    const { payload } = pubSubAction
    const members = getUpdatedMembers({ action: pubSubAction, memberList })
    const memberListPayload = {
      room_session_id: payload.room_session_id || payload.room_session.id,
      members,
    }

    // TODO: add typings
    yield sagaEffects.put(pubSubChannel, {
      type: SYNTHETIC_MEMBER_LIST_UPDATED_EVENT as any,
      payload: memberListPayload as any,
    })
  }

  while (true) {
    const pubSubAction = yield sagaEffects.take(
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

    const { memberList, cleanup } = initMemberListSubscriptions(
      instance,
      subscriptions
    )

    yield sagaEffects.fork(membersListUpdatedWatcher, {
      pubSubChannel,
      memberList,
    })

    instance.once('destroy', () => {
      cleanup()
    })
  }
