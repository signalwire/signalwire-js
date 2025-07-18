import {
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
  SDKActions,
  MapToPubSubShape,
} from '@signalwire/core'
import { CallAction, InternalCallMemberEntityUpdated } from '../../utils/interfaces'
import { CallSessionConnection } from '../CallSession'
import { createCallSessionMemberObject } from '../CallSessionMember'
import { callSegmentWorker } from './callSegmentWorker'
import { ShallowCompute } from '../../utils/typeUtils'

export type FabricWorkerParams<T> = SDKWorkerParams<CallSessionConnection> & {
  action: ShallowCompute<MapToPubSubShape<T>>
}

export const fabricWorker: SDKWorker<CallSessionConnection> = function* (
  options
): SagaIterator {
  getLogger().trace('fabricWorker started')
  const {
    channels: { swEventChannel },
    instance: cfRoomSession,
  } = options

  function* worker(action: CallAction) {
    const { type, payload } = action

    switch (type) {
      case 'call.joined': {
        // since we depend on `cfRoomSession.selfMember` on the take logic
        // we need to make sure we update the `cfRoomSession.selfMember`
        // in this worker or have a race condition.
        if (!cfRoomSession.selfMember) {          
          const memberInstance = createCallSessionMemberObject({
            store: cfRoomSession.store,
            payload: {
              member: action.payload.room_session.members.find(
                (m) => m.member_id === action.payload.member_id
              )! as InternalCallMemberEntityUpdated,
              room_id: action.payload.room_id,
              room_session_id: action.payload.room_session_id,
            },
          })
          cfRoomSession.selfMember = memberInstance
        }

        // Segment worker for each call_id
        yield sagaEffects.fork(callSegmentWorker, {
          ...options,
          instance: cfRoomSession,
          action,
        })
        break
      }
      case 'call.state':
        cfRoomSession.emit(type, payload)
        break
    }
  }

  let firstCallJoinedReceived = false
  const isFirstCallJoinedorCallStateEvent = (action: SDKActions) => {
    if (action.type === 'call.state') {
      return true
    }

    if (action.type !== 'call.joined') {
      return false
    }

    // If this is the first call.joined event, verify the call origin ID
    if (!firstCallJoinedReceived) {
      const callId = action.payload.call_id
      const originCallId = action.payload.origin_call_id
      if (callId === originCallId) {
        firstCallJoinedReceived = true
        return true
      }
      return false // Discard all the call.joined event until the first call.joined is received
    }

    // If first call.joined event already received, only check the action type
    return true
  }

  while (true) {
    const action: CallAction = yield sagaEffects.take(
      swEventChannel,
      isFirstCallJoinedorCallStateEvent
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('fabricWorker ended')
}
