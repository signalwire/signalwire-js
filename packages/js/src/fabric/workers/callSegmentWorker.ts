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

export const callSegmentWorker: SDKWorker<CallFabricRoomSessionConnection> =
  function* (options): SagaIterator {
    const {
      initialState: bootstrapAction,
      channels: { swEventChannel },
      instance: cfRoomSession,
    } = options

    const segmentRoutingId = bootstrapAction.payload.roomSessionId || bootstrapAction.payload.callId

    getLogger().debug(`callSegmentWorker started for: ${segmentRoutingId}`)

    //handles the `call.joined` event before the worker loop
    yield sagaEffects.fork(callJoinWorker, {
      ...options,
      action: bootstrapAction,
    })

    const isSegmentEvent = (action: CallFabricAction) => {
      const shouldWatch = (eventType: String) =>
        eventType.startsWith('call.') ||
        eventType.startsWith('member.') ||
        eventType.startsWith('layout.')
      
      //@ts-expect-error
      const eventRoutingId = action.payload.roomSessionId || action.payload.callId

      return (
        shouldWatch(action.type) && segmentRoutingId === eventRoutingId
      )
    }

    while (true) {
      const action = yield sagaEffects.take(swEventChannel, (action: any) =>
        isSegmentEvent(action)
      )
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
        case 'member.talking':
          {
            const updatedAction = {
              ...action,
              type: `video.${type}` as VideoMemberEventNames,
            }

            yield sagaEffects.fork(videoMemberWorker, {
              action: updatedAction,
              ...options,
            })

            yield sagaEffects.put(swEventChannel, updatedAction)
          }
          break
        case 'layout.changed':
          {
            // Upsert the layout event which is needed for rootElement
            cfRoomSession.lastLayoutEvent = action.payload
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
