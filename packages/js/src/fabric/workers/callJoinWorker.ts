import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  CallJoinedEvent,
  sagaEffects,
  mapObject,
  RoomSessionMember,
  Rooms,
} from '@signalwire/core'
import { CallFabricWorkerParams } from './callFabricWorker'
import { createCallSegmentObject } from '../CallSegment'

export const callJoinWorker = function* (
  options: CallFabricWorkerParams<MapToPubSubShape<CallJoinedEvent>>
): SagaIterator {
  getLogger().trace('callJoinWorker started')
  const {
    channels,
    action,
    callSegments,
    instanceMap,
    instance: cfRoomSession,
  } = options
  const { swEventChannel } = channels
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

  // @ts-expect-error
  const mappedAction = mapObject('video.room.subscribed', action)
  // @ts-expect-error
  yield sagaEffects.put(swEventChannel, mappedAction)

  getLogger().trace('callJoinWorker ended')
}
