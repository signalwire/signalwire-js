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
    const isCallJoinedEvent = (action: any) => {
      // We should only start to handling call.joined events after
      // we receive the 1st call.joined event where action.call_id == action.orignCallId
      return (!!cfRoomSessionConnection.selfMember || (action.eventRoutingId == action.originCallId))  && action.type === 'call.joined'
    }

    while (true) {
      const action = yield sagaEffects.take(swEventChannel, isCallJoinedEvent)
      
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
