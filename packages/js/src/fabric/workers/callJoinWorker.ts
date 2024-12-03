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
  mapCapabilityPayload,
} from '@signalwire/core'
import { CallFabricWorkerParams } from './callFabricWorker'
import { videoMemberWorker } from '../../video/videoMemberWorker'

export const callJoinWorker = function* (
  options: CallFabricWorkerParams<MapToPubSubShape<CallJoinedEvent>>
): SagaIterator {
  getLogger().trace('callJoinWorker started')
  const { action, instanceMap, instance: cfRoomSession } = options
  const { payload } = action
  const { get, set } = instanceMap

  payload.room_session.members?.forEach((member: any) => {
    let memberInstance = get<RoomSessionMember>(member.member_id!)
    if (!memberInstance) {
      memberInstance = Rooms.createRoomSessionMemberObject({
        store: cfRoomSession.store,
        payload: {
          call_id: payload.call_id,
          member_id: payload.member_id,
          member: member,
          node_id: payload.node_id,
          room_id: payload.room_id,
          room_session_id: payload.room_session_id,
        },
      })
    } else {
      memberInstance.setPayload({
        call_id: payload.call_id,
        member_id: payload.member_id,
        member: member,
        node_id: payload.node_id,
        room_id: payload.room_id,
        room_session_id: payload.room_session_id,
      })
    }
    set<RoomSessionMember>(member.member_id, memberInstance)
  })

  cfRoomSession.member = get<RoomSessionMember>(payload.member_id)
  cfRoomSession.capabilities = mapCapabilityPayload(payload.capabilities || [])

  cfRoomSession.runWorker('memberPositionWorker', {
    worker: MemberPosition.memberPositionWorker,
    ...options,
    // @ts-expect-error
    instance: cfRoomSession,
    initialState: payload,
    dispatcher: function* (
      subType: InternalMemberUpdatedEventNames,
      // @ts-expect-error
      subPayload
    ) {
      // @ts-expect-error
      yield sagaEffects.fork(videoMemberWorker, {
        ...options,
        action: { type: subType, payload: subPayload },
      })
    },
  })

  cfRoomSession.emit('call.joined', {
    ...payload,
    capabilities: cfRoomSession.capabilities,
  })

  getLogger().trace('callJoinWorker ended')
}
