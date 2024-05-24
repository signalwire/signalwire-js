import {
  CallFabricAction,
  SDKWorker,
  SagaIterator,
  VideoMemberEventNames,
  VideoRoomSessionEventNames,
  getLogger,
  sagaEffects,
} from '@signalwire/core'
import { callLeftWorker } from './callLeftWorker'
import { callStateWorker } from './callStateWorker'
import { callJoinWorker } from './callJoinWorker'
import { CallFabricRoomSessionConnection } from '../CallFabricRoomSession'
import { videoMemberWorker } from '../../video/videoMemberWorker'



const TO_WATCH_EVENTS = [
  'member.updated',
  'layout.changed',
  'member.joined',
  'member.left',
  'member.talking',
  'member.demoted',
  'member.promoted',
  'call.left',
]



export const callSegmentWorker: SDKWorker<CallFabricRoomSessionConnection> = function* (
  options
): SagaIterator {
  const {
    initialState: bootstrapAction,
    channels: { swEventChannel },
    instance: cfRoomSession,
  } = options

  const eventRoutingId = bootstrapAction.eventRoutingId

  getLogger().debug(`callSegmentWorker started for: ${eventRoutingId}`)
  
  //handles the `call.joined` event before the worker loop
  yield sagaEffects.fork(callJoinWorker, {
    ...options,
    action: bootstrapAction
  })

  const isSegmentEvent = ( action: CallFabricAction) => {
    if(!!TO_WATCH_EVENTS.includes(action.type)) {
      getLogger().debug(`###  Should handle ${action.type} ${eventRoutingId} == ${action.eventRoutingId}`)
    }
    return  !!TO_WATCH_EVENTS.includes(action.type) && (eventRoutingId === action.eventRoutingId)
  }

  while (true) {
    const action = yield sagaEffects.take(swEventChannel, (action: any) => isSegmentEvent(action))
    const { type, payload } = action

    switch (type) {
      case 'call.joined': 
        getLogger().warn('got a repeated call.joined event', action)
        break
      case 'call.left':
        yield sagaEffects.fork(callLeftWorker, {
          ...options,
          action,
        })
        break
      case 'call.state':
        yield sagaEffects.fork(callStateWorker, {
          ...options,
          action,
        })
        cfRoomSession.emit(type, payload)
        break
      case 'call.started':
      case 'call.updated':
      case 'call.ended':
        const suffix = type.split('.')[1]
        const newEventName = `room.${suffix}` as VideoRoomSessionEventNames
        cfRoomSession.emit(newEventName, payload)
        cfRoomSession.emit(type, payload)
        break
      
      case 'member.joined':
      case 'member.left':
      case 'member.updated':
      case 'member.talking': {
        const updatedAction = {
          ...action,
          type: `video.${type}` as VideoMemberEventNames,
        }
        
        yield sagaEffects.fork(videoMemberWorker, {
          action: updatedAction,
          ...options,
        })

        // muted local devices
        yield sagaEffects.put(swEventChannel, updatedAction)
        }
        break
      case 'layout.changed': {
        const updatedAction = {
          ...action,
          type: `video.${type}` as 'video.layout.changed',
        }
        //TODO stop send layout evets to legacy workers
        yield sagaEffects.put(swEventChannel, updatedAction)
        cfRoomSession.emit(type, payload)
        }
        break
      case 'member.demoted':
      case 'member.promoted':
        getLogger().warn('promoted/demoted events not supported')
        cfRoomSession.emit(type, payload)
        break
      default:
        cfRoomSession.emit(type, payload)
    }

    
  }

}
