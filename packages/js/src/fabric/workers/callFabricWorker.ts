import {
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
  Rooms,
  CallFabricAction,
} from '@signalwire/core'
import { CallFabricRoomSessionConnection } from '../CallFabricRoomSession'
import { callSegmentWorker } from './callSegmentWorker'
import { callStateWorker } from './callStateWorker'

export type CallFabricWorkerParams<T> =
  SDKWorkerParams<CallFabricRoomSessionConnection> & {
    action: T
  }

export const callFabricWorker: SDKWorker<CallFabricRoomSessionConnection> =
  function* (options): SagaIterator {
    getLogger().trace('callFabricWorker started')

    const {
      channels: { swEventChannel },
      instance: cfRoomSessionConnection,
    } = options

    const isCallJoinedOrCallStateEvent = (action: CallFabricAction) => {
      // We should only start to handling call.joined events after
      // we receive the 1st call.joined event where eventRoutingId == action.origin_call_id

      
  
      const eventRoutingId =
      //@ts-expect-error
        action.payload.room_session_id || action.payload.call_id
      
      return (
        // FIXME call.state events are not beeing fired after the call.joined as expected
        action.type === 'call.state' ||
        (action.type === 'call.joined' &&
          (!!cfRoomSessionConnection.selfMember ||
            //@ts-expect-error
            eventRoutingId == action.payload.origin_call_id))
      )
    }

    let originCallId
    while (true) {
      
      const action = yield sagaEffects.take(
        //@ts-expect-error
        swEventChannel,
        isCallJoinedOrCallStateEvent
      )
      const { type, payload } = action
      switch (type) {
        case 'call.joined':
          if(!originCallId && (payload.origin_call_id === payload.call_id)) {
            originCallId = payload.call_id
          }
          // since we depend on `cfRoomSessionConnection.selfMember` on the take logic
          // we need to make sure we update the `cfRoomSessionConnection.selfMember`
          // in this worker or have a race condition.
          if (!cfRoomSessionConnection.selfMember) {
            const memberInstance = Rooms.createRoomSessionMemberObject({
              store: cfRoomSessionConnection.store,
              payload: {
                room_id: action.payload.room_id,
                room_session_id: action.payload.room_session_id,
                member: action.payload.room_session.members.find(
                  (m: { member_id: string }) =>
                    m.member_id == action.payload.member_id
                ),
              },
            })
            cfRoomSessionConnection.selfMember = memberInstance
          }
          cfRoomSessionConnection.runWorker('callSegmentWorker', {
            worker: callSegmentWorker,
            ...options,
            initialState: action,
          })
          break
        case 'call.state':
          cfRoomSessionConnection.emit(type, payload)
          yield sagaEffects.fork(callStateWorker, {
            ...options,
            action,
            shouldDestroy: originCallId == payload.call_id,
          })
          break
      }
    }
  }
