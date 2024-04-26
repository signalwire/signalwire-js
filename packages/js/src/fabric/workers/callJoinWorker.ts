import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  CallJoinedEvent,
  sagaEffects,
  RoomSessionMember,
  Rooms,
  MemberPosition,
  InternalMemberUpdatedEventNames,
} from '@signalwire/core'
import { CallFabricWorkerParams } from './callFabricWorker'
import { createCallSegmentObject } from '../CallSegment'
import { videoMemberWorker } from '../../video/videoMemberWorker'

export const callJoinWorker = function* (
  options: CallFabricWorkerParams<MapToPubSubShape<CallJoinedEvent>>
): SagaIterator {
  getLogger().trace('callJoinWorker started')
  const { action, callSegments, instanceMap, instance: cfRoomSession } = options
  const { payload } = action
  const { get, set } = instanceMap

  const memberInstances = payload.room_session.members?.map((member: any) => {
    let memberInstance = get<RoomSessionMember>(member.member_id!)
    if (!memberInstance) {
      memberInstance = Rooms.createRoomSessionMemberObject({
        store: cfRoomSession.store,
        payload: {
          room_id: payload.room_id,
          room_session_id: payload.room_session_id,
          member,
        },
      })
    } else {
      memberInstance.setPayload({
        room_id: payload.room_id,
        room_session_id: payload.room_session_id,
        member: member,
      })
    }
    set<RoomSessionMember>(member.member_id, memberInstance)
    return memberInstance
  })

  const callSegmentInstance = createCallSegmentObject({
    store: cfRoomSession.store,
    payload: {
      ...payload,
      members: memberInstances!,
    },
  })
  callSegments.push(callSegmentInstance)

  yield sagaEffects.spawn(MemberPosition.memberPositionWorker, {
    ...options,
    instance: cfRoomSession,
    initialState: payload,
    dispatcher: function* (
      subType: InternalMemberUpdatedEventNames,
      subPayload
    ) {
      yield sagaEffects.fork(videoMemberWorker, {
        ...options,
        action: { type: subType, payload: subPayload },
      })
    },
  })
  // FIXME: Why do we need to emit member.joined from here?
  for (const memberPayload of payload.room_session.members || []) {
    // @ts-expect-error
    yield sagaEffects.fork(videoMemberWorker, {
      ...options,
      action: {
        type: 'video.member.joined',
        payload: { member: memberPayload },
      },
    })
  }
  cfRoomSession.emit('room.subscribed', payload)

  getLogger().trace('callJoinWorker ended')
}
