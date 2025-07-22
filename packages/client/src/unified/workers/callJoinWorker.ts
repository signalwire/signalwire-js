import {
  getLogger,
  SagaIterator,
  CallJoinedEvent,
  sagaEffects,
  MemberPosition,
  stripNamespacePrefix,
} from '@signalwire/core'
import {
  createCallSessionMemberObject,
  CallSessionMember,
} from '../CallSessionMember'
import { UCallWorkerParams } from './fabricWorker'
import { fabricMemberWorker } from './fabricMemberWorker'
import { mapCapabilityPayload } from '../utils/capabilitiesHelpers'
import { mapCallJoinedToRoomSubscribedEventParams } from '../utils/eventMappers'

export const callJoinWorker = function* (
  options: UCallWorkerParams<CallJoinedEvent>
): SagaIterator {
  getLogger().trace('callJoinWorker started')
  const { action, instanceMap, instance: cfRoomSession } = options
  const { payload } = action
  const { get, set } = instanceMap

  yield sagaEffects.fork(MemberPosition.memberPositionWorker, {
    ...options,
    /**
     * The {@link memberPositionWorker} worker understands only the Video SDK events.
     * So, we need to map CF SDK event to Video SDK event.
     * Similar to what we do in the {@link callSegmentWorker}, for member events.
     */
    initialState: mapCallJoinedToRoomSubscribedEventParams(payload),
    dispatcher: function* (subType, subPayload) {
      /**
       * The {@link memberPositionWorker} dispatches the Video SDK events.
       * We need to convert it back to CF SDK event before emitting to the user.
       */
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
    let memberInstance = get<CallSessionMember>(member.member_id!)
    if (!memberInstance) {
      memberInstance = createCallSessionMemberObject({
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
    set<CallSessionMember>(member.member_id, memberInstance)
  })

  cfRoomSession.member = get<CallSessionMember>(payload.member_id)
  // the server send the capabilities payload as an array of string
  cfRoomSession.capabilities = mapCapabilityPayload(payload.capabilities)

  const fabricEvent = {
    ...payload,
    capabilities: cfRoomSession.capabilities,
  }

  cfRoomSession.emit('call.joined', fabricEvent)

  getLogger().trace('callJoinWorker ended')
}
