import { fork } from '@redux-saga/core/effects'
import {
  InternalVideoMemberEntity,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  VideoRoomSubscribedEventParams,
} from '..'
import { findNamespaceInPayload } from '../redux/features/shared/namespace'

function* memberPositionLayoutChanged(options: any) {
  const { action, memberList } = options

  const layers = action.payload.layout.layers

  console.log('> Member list', Array.from(memberList))

  memberList.forEach((member: InternalVideoMemberEntity) => {
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

        console.log(
          '---> trigger member.updated -> member has a different position'
        )
      }
    } else {
      // Member started on-canvas and is now off-canvas.
      if (member.requested_position !== 'off-canvas') {
        console.log('---> trigger member.updated -> member is now off canvas')
      }
    }
  })
}

function* memberPositionDiffWorker(options: any) {
  const { action, memberList } = options

  console.log('memberPositionDiffWorker', JSON.stringify(action, null, 2))
  switch (action.type) {
    case 'video.member.updated':
      // This will erase the `currentPosition`. Should we leave the last one (if any)?
      memberList.set(action.payload.member.id, action.payload.member)

      console.log('---> UPDATED MEMBER LIST', Array.from(memberList))

      break
    case 'video.layout.changed':
      yield fork(memberPositionLayoutChanged, options)
      break
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
          action.type.startsWith('video.member.updated') ||
          action.type.startsWith('video.layout.changed')

        return (
          istargetEvent &&
          findNamespaceInPayload(action) === instance._eventsNamespace
        )
      })

      yield fork(memberPositionDiffWorker, {
        action,
        channels,
        memberList,
        instance,
      })

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
    console.log('->> member', member.id)
    memberList.set(member.id, member)
  })

  return memberList
}
