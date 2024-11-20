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
  })

  cfRoomSession.member = get<RoomSessionMember>(payload.member_id)

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
      yield sagaEffects.fork(videoMemberWorker, {
        ...options,
        action: { type: subType, payload: subPayload },
      })
    },
  })

  cfRoomSession.capabilities = mapCapabilityPayload(
    payload.capabilities || []
  )
  // @ts-expect-error
  cfRoomSession.emit('call.joined', {
    ...payload,
    capabilities: cfRoomSession.capabilities,
  })

  getLogger().trace('callJoinWorker ended')
}
