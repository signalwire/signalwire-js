import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  toSyntheticEvent,
  validateEventsToSubscribe,
  toInternalEventName,
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

const isMemberListEvent = (event: string) => {
  return MEMBER_LIST_EVENTS.includes(event)
}

const getMemberListEventsToSubscribe = (subscriptions: string[]) => {
  return validateEventsToSubscribe(MEMBER_LIST_EVENTS).filter((event) => {
    return !subscriptions.includes(event as string)
  })
}

const shouldListenToMemberList = (subscriptions: string[]) => {
  return subscriptions.some((event) =>
    event.includes(INTERNAL_MEMBER_LIST_UPDATED_EVENT)
  )
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

  // TODO: handle off for this event.
  room.on(SYNTHETIC_MEMBER_LIST_UPDATED_EVENT as any, (payload) => {
    // @ts-expect-error
    room.emit(EXTERNAL_MEMBER_LIST_UPDATED_EVENT, payload)
  })
}

export const memberListUpdatedWorker: SDKWorker<RoomSession> =
  function* membersChangedWorker({
    channels: { pubSubChannel },
    instance,
  }): SagaIterator {
    // @ts-expect-error
    const subscriptions = instance.getSubscriptions()

    if (!shouldListenToMemberList(subscriptions)) {
      return
    }

    initMemberListSubscriptions(instance, subscriptions)

    while (true) {
      const pubSubAction = yield sagaEffects.take(
        pubSubChannel,
        ({ type }: any) => {
          return isMemberListEvent(type)
        }
      )

      const { payload } = pubSubAction

      // TODO: complete payload with the updated member list.
      const memberListPayload = {
        room_session_id: payload.room_session_id || payload.room_session.id,
      }

      // TODO: add typings
      yield sagaEffects.put(pubSubChannel, {
        type: SYNTHETIC_MEMBER_LIST_UPDATED_EVENT as any,
        payload: memberListPayload as any,
      })
    }
  }
