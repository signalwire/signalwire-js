import {
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
  Rooms,
  SDKActions,
  FabricAction,
} from '@signalwire/core'
import { FabricRoomSessionConnection } from '../FabricRoomSession'
import { callSegmentWorker } from './callSegmentWorker'

export type FabricWorkerParams<T> =
  SDKWorkerParams<FabricRoomSessionConnection> & {
    action: T
  }

export const fabricWorker: SDKWorker<FabricRoomSessionConnection> = function* (
  options
): SagaIterator {
  getLogger().trace('FabricWorker started')

  const {
    channels: { swEventChannel },
    instance: cfRoomSession,
  } = options

  function* worker(action: FabricAction) {
    const { type, payload } = action

    switch (type) {
      case 'call.joined': {
        // since we depend on `cfRoomSession.selfMember` on the take logic
        // we need to make sure we update the `cfRoomSession.selfMember`
        // in this worker or have a race condition.
        if (!cfRoomSession.selfMember) {
          const memberInstance = Rooms.createRoomSessionMemberObject({
            store: cfRoomSession.store,
            payload: {
              call_id: action.payload.call_id,
              member_id: action.payload.member_id,
              member: action.payload.room_session.members.find(
                (m) => m.member_id === action.payload.member_id
              )!,
              node_id: action.payload.node_id,
              room_id: action.payload.room_id,
              room_session_id: action.payload.room_session_id,
            },
          })
          cfRoomSession.selfMember = memberInstance
        }

        // Segment worker for each call_id
        yield sagaEffects.spawn(callSegmentWorker, {
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
  const isCallJoinedorCallStateEvent = (action: SDKActions) => {
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
    const action: FabricAction = yield sagaEffects.take(
      swEventChannel,
      isCallJoinedorCallStateEvent
    )

    yield sagaEffects.fork(worker, action)
  }
}
