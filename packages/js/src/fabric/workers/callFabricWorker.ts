import {
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
  Rooms,
} from '@signalwire/core'
import { CallFabricRoomSessionConnection } from '../CallFabricRoomSession'
import { callSegmentWorker } from './callSegmentWorker'

export type CallFabricWorkerParams<T> =
  SDKWorkerParams<CallFabricRoomSessionConnection> & {
    action: T
  }

export const callFabricWorker: SDKWorker<CallFabricRoomSessionConnection> =
  function* (options): SagaIterator {
    getLogger().trace('callFabricWorker started')

    const { channels: { swEventChannel }, instance: cfRoomSessionConnection } = options

    // FIXME remove the any
    const isCallJoinedEvent = (action:any ) => {
      // We should only start to handling call.joined events after
      // we receive the 1st call.joined event where eventRoutingId == action.orignCallI
      
      const eventRoutingId = action.roomSessionId || action.callId
      return action.type === 'call.joined' && (!!cfRoomSessionConnection.selfMember || (eventRoutingId == action.originCallId))
    }

    while (true) {
      const action = yield sagaEffects.take(swEventChannel, isCallJoinedEvent)
      
      // since we depend on `cfRoomSessionConnection.selfMember` on the take logic
      // we need to make sure we update the `cfRoomSessionConnection.selfMember`
      // in this worker or have a race condition. 
      if(!cfRoomSessionConnection.selfMember) {
        const memberInstance = Rooms.createRoomSessionMemberObject({
          store: cfRoomSessionConnection.store,
          payload: {
            room_id: action.payload.room_id,
            room_session_id: action.payload.room_session_id,
            member: action.payload.room_session.members
              .find((m: {member_id: string}) => m.member_id == action.payload.member_id)
          },
        })
        cfRoomSessionConnection.selfMember = memberInstance
      }

      cfRoomSessionConnection.runWorker('callSegmentWorker',
       { worker: callSegmentWorker,
        ...options, 
        initialState: action,
        
      })
    }

  }
