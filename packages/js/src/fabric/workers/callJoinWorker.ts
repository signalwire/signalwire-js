import {
  getLogger,
  SagaIterator,
  CallJoinedEvent,
  sagaEffects,
  MemberPosition,
  mapCapabilityPayload,
  stripNamespacePrefix,
} from '@signalwire/core'
import {
  createFabricRoomSessionMemberObject,
  FabricRoomSessionMember,
} from '../FabricRoomSessionMember'
import { FabricWorkerParams } from './fabricWorker'
import { fabricMemberWorker } from './fabricMemberWorker'
import { mapCallJoinedToRoomSubscribedEventParams } from '../utils/helpers'

export const callJoinWorker = function* (
  options: FabricWorkerParams<CallJoinedEvent>
): SagaIterator {
  getLogger().trace('callJoinWorker started')
  const { action, instanceMap, instance: cfRoomSession } = options
  const { payload } = action
  const { get, set } = instanceMap

  // TODO: Put `video.room.subscribed` event on the channel for roomSubscribedWorker

  yield sagaEffects.spawn(MemberPosition.memberPositionWorker, {
    ...options,
    initialState: mapCallJoinedToRoomSubscribedEventParams(payload),
    dispatcher: function* (subType, subPayload) {
      const fabricType = stripNamespacePrefix(subType, 'video') as any
      const fabricPaylod = {
        ...subPayload,
        member: {
          ...subPayload.member,
          member_id: subPayload.member.id,
        },
      }
      yield sagaEffects.fork(fabricMemberWorker, {
        ...options,
        action: { type: fabricType, payload: fabricPaylod },
      })
    },
  })

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

  // FIXME: Capabilities type is incompatible.
  // @ts-expect-error
  cfRoomSession.emit('call.joined', {
    ...payload,
    capabilities: cfRoomSession.capabilities,
  })

  getLogger().trace('callJoinWorker ended')
}
