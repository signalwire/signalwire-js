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

    const segmentRoutingRoomSessionId = bootstrapAction.payload.room_session_id
    const segmentRoutingCallId = bootstrapAction.payload.call_id

    getLogger().debug(`callSegmentWorker started for: callId ${segmentRoutingCallId} roomSessionId segmentRoutingRoomSessionId`)

    //handles the `call.joined` event before the worker loop
    yield sagaEffects.fork(callJoinWorker, {
      ...options,
      action: bootstrapAction,
    })

    const isSegmentEvent = (action: CallFabricAction) => {
      const shouldWatch = () =>
        action.type.startsWith('call.') ||
        action.type.startsWith('member.') ||
        action.type.startsWith('layout.')

      return (
        shouldWatch() && (segmentRoutingRoomSessionId === action.payload.room_session_id || segmentRoutingCallId === action.payload.call_id)
      )
    }

    while (true) {
      // @ts-expect-error swEventChannel created in core is unware CallFabric types
      const action = yield sagaEffects.take(swEventChannel, isSegmentEvent)

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
              payload: {
                ...action.payload,
                id: action.payload.member_id,
              },
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
            // TODO stop send layout events to legacy workers
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
