import { fork, put } from '@redux-saga/core/effects'
import {
  InternalVideoMemberEntity,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  VideoRoomSubscribedEventParams,
} from '..'
import { findNamespaceInPayload } from '../redux/features/shared/namespace'

function* memberPositionLayoutChanged(options: any) {
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
          // This will erase the `currentPosition`. Should
          // we leave the last one (if any)?
          memberList.set(action.payload.member.id, action.payload.member)
          break
        }
        case 'video.member.joined': {
          const member = action.payload.member
          memberList.set(member.id, member)
          break
        }
        case 'video.member.left': {
          const member = action.payload.member
          memberList.delete(member.id)
          break
        }
        case 'video.layout.changed': {
          yield fork(memberPositionLayoutChanged, {
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

type MemberList = Map<string, InternalVideoMemberEntity>

export const getMemberList = (payload: VideoRoomSubscribedEventParams) => {
  const members = payload.room.members
  const memberList: MemberList = new Map()

  members.forEach((member: any) => {
    memberList.set(member.id, member)
  })

  return memberList
}
