import {
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
  SDKActions,
  MapToPubSubShape,
  CallAction,
} from '@signalwire/core'
import { CallSessionConnection } from '../CallSession'
import { createCallSessionMemberObject } from '../CallSessionMember'
import { callSegmentWorker } from './callSegmentWorker'

export type CallWorkerParams<T> = SDKWorkerParams<CallSessionConnection> & {
  action: MapToPubSubShape<T>
}

export const fabricWorker: SDKWorker<CallSessionConnection> = function* (
  options
): SagaIterator {
  getLogger().trace('fabricWorker started')
  const {
    channels: { swEventChannel },
    instance: callSession,
  } = options

  function* worker(action: CallAction) {
    const { type, payload } = action

    switch (type) {
      case 'call.joined': {
        // since we depend on `callSession.selfMember` on the take logic
        // we need to make sure we update the `callSession.selfMember`
        // in this worker or have a race condition.
        if (!callSession.selfMember) {
          const memberInstance = createCallSessionMemberObject({
            store: callSession.store,
            payload: {
              member: action.payload.room_session.members.find(
                (m) => m.member_id === action.payload.member_id
              )!,
              room_id: action.payload.room_id,
              room_session_id: action.payload.room_session_id,
            },
          })
          callSession.selfMember = memberInstance
        }

        // Segment worker for each call_id
        yield sagaEffects.fork(callSegmentWorker, {
          ...options,
          instance: callSession,
          action,
        })
        break
      }
      case 'call.state':
        callSession.emit(type, payload)
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
      if (action.payload.call_id === callSession.callId) {
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
}
