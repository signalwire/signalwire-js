import { fork, put } from '@redux-saga/core/effects'
import {
  InternalMemberUpdatedEventNames,
  InternalVideoMemberEntity,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKWorkerParams,
  VideoMemberUpdatedEventParams,
  VideoRoomSubscribedEventParams,
} from '..'
import { findNamespaceInPayload } from '../redux/features/shared/namespace'

function* memberPositionLayoutChangedWorker(options: any) {
  const {
    action,
    memberList,
    channels: { pubSubChannel },
    instance,
  } = options
  const layers = action.payload.layout.layers

  for (const [_, member] of memberList) {
    const memberLayer = layers.find(
      (layer: any) => layer.member_id === member.id
    )

    if (memberLayer) {
      if (memberLayer.position !== member.current_position) {
        /**
         * We'll keep track of the last `current_position`
         * inside of the member so we could use it to
         * compare it with the next value.
         */
        const updatedMember: InternalVideoMemberEntity = {
          ...member,
          current_position: memberLayer.position,
        }
        memberList.set(member.id, updatedMember)
        yield put(pubSubChannel, {
          type: 'video.member.updated',
          payload: {
            room_session_id: instance._eventsNamespace,
            member: updatedMember,
          },
        })
      }
    } else {
      // Member started on-canvas and is now off-canvas.
      if (member.requested_position !== 'off-canvas') {
        const updatedMember: InternalVideoMemberEntity = {
          ...member,
          current_position: 'off-canvas',
        }
        memberList.set(member.id, updatedMember)
        yield put(pubSubChannel, {
          type: 'video.member.updated',
          payload: {
            room_session_id: instance._eventsNamespace,
            member: updatedMember,
          },
        })
      }
    }
  }
}

function* memberUpdatedWorker({
  action,
  channels,
  memberList,
}: Omit<SDKWorkerParams<any>, 'runSaga'> & {
  memberList: MemberEventParamsList
  action: any
}) {
  const updatedMemberEventParams: VideoMemberUpdatedEventParams = {
    ...memberList.get(action.payload.member.id)!,
    member: {
      ...action.payload.member,
      /**
       * Since the event doesn't come with
       * `current_position` we'll try to keep its
       * previous value (if any).
       */
      current_position: memberList.get(action.payload.member.id)?.member
        ?.current_position,
    },
  }
  memberList.set(action.payload.member.id, updatedMemberEventParams)

  const {
    member: { updated = [] },
  } = action.payload
  console.log('UPDATED', updated)

  for (const key of updated) {
    const type = `${action.type}.${key}` as InternalMemberUpdatedEventNames
    yield put(channels.pubSubChannel, {
      type,
      payload: updatedMemberEventParams,
    })
  }

  yield put(channels.pubSubChannel, {
    type: action.type,
    payload: updatedMemberEventParams,
  })
}

export const memberPositionWorker: SDKWorker<any> =
  function* memberPositionWorker({ instance, channels }): SagaIterator {
    const { swEventChannel } = channels
    const action = yield sagaEffects.take(swEventChannel, (action: any) => {
      const istargetEvent = action.type === 'video.room.subscribed'

      return (
        istargetEvent &&
        findNamespaceInPayload(action) === instance._eventsNamespace
      )
    })
    let memberList = getMemberList(action.payload)

    const cleanup = () => {
      memberList.clear()
    }

    while (true) {
      const action = yield sagaEffects.take(swEventChannel, (action: any) => {
        const istargetEvent =
          action.type === 'video.member.updated' ||
          action.type === 'video.layout.changed' ||
          action.type === 'video.member.joined' ||
          action.type === 'video.member.left'

        return (
          istargetEvent &&
          findNamespaceInPayload(action) === instance._eventsNamespace
        )
      })

      switch (action.type) {
        case 'video.member.updated': {
          yield fork(memberUpdatedWorker, {
            action,
            channels,
            memberList,
            instance,
          })

          break
        }
        case 'video.member.joined': {
          const member = action.payload.member
          memberList.set(member.id, action.payload)
          break
        }
        case 'video.member.left': {
          const member = action.payload.member
          memberList.delete(member.id)
          break
        }
        case 'video.layout.changed': {
          yield fork(memberPositionLayoutChangedWorker, {
            action,
            channels,
            memberList,
            instance,
          })
          break
        }
      }

      instance.once('destroy', () => {
        cleanup()
      })
    }
  }

type MemberEventParamsList = Map<string, VideoMemberUpdatedEventParams>

export const getMemberList = (payload: VideoRoomSubscribedEventParams) => {
  const members = payload.room.members
  const memberList: MemberEventParamsList = new Map()

  members.forEach((member) => {
    memberList.set(member.id, {
      room_id: payload.room.room_id,
      room_session_id: payload.room.room_session_id,
      // At this point we don't have `member.updated`
      // @ts-expect-error
      member,
    })
  })

  return memberList
}
