import {
  getLogger,
  SagaIterator,
  CallJoinedEvent,
  sagaEffects,
  MemberPosition,
  InternalMemberUpdatedEventNames,
  mapCapabilityPayload,
} from '@signalwire/core'
import {
  createFabricRoomSessionMemberObject,
  FabricRoomSessionMember,
} from '../FabricRoomSessionMember'
import { FabricWorkerParams } from './fabricWorker'
import { fabricMemberWorker } from './fabricMemberWorker'

export const callJoinWorker = function* (
  options: FabricWorkerParams<CallJoinedEvent>
): SagaIterator {
  getLogger().trace('callJoinWorker started')
  const { action, instanceMap, instance: cfRoomSession } = options
  const { payload } = action
  const { get, set } = instanceMap

  payload.room_session.members?.forEach((member: any) => {
    let memberInstance = get<FabricRoomSessionMember>(member.member_id!)
    if (!memberInstance) {
      memberInstance = createFabricRoomSessionMemberObject({
        store: cfRoomSession.store,
        payload: {
          member: member,
          room_id: payload.room_id,
          room_session_id: payload.room_session_id,
        },
      })
    } else {
      memberInstance.setPayload({
        member: member,
        room_id: payload.room_id,
        room_session_id: payload.room_session_id,
      })
    }
    set<FabricRoomSessionMember>(member.member_id, memberInstance)
  })

  cfRoomSession.member = get<FabricRoomSessionMember>(payload.member_id)
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
      yield sagaEffects.fork(fabricMemberWorker, {
        ...options,
        action: { type: subType, payload: subPayload },
      })
    },
  })

  // FIXME: Capabilities type is incompatible.
  // @ts-expect-error
  cfRoomSession.emit('call.joined', {
    ...payload,
    capabilities: cfRoomSession.capabilities,
  })

  getLogger().trace('callJoinWorker ended')
}
