import {
  CallFabricAction,
  CallJoinedEvent,
  MapToPubSubShape,
  SDKActions,
  SagaIterator,
  VideoMemberEventNames,
  VideoRoomSessionEventNames,
  getLogger,
  sagaEffects,
} from '@signalwire/core'
import { callLeftWorker } from './callLeftWorker'
import { callJoinWorker } from './callJoinWorker'
import { videoMemberWorker } from '../../video/workers/videoMemberWorker'
import { CallFabricWorkerParams } from './callFabricWorker'

export const callSegmentWorker = function* (
  options: CallFabricWorkerParams<MapToPubSubShape<CallJoinedEvent>>
): SagaIterator {
  const {
    action,
    channels: { swEventChannel },
    instance: cfRoomSession,
  } = options
  const segmentCallId = action.payload.call_id

  getLogger().debug(`callSegmentWorker started for: callId ${segmentCallId}`)

  // Handles the `call.joined` event before the worker loop
  yield sagaEffects.fork(callJoinWorker, {
    ...options,
    action,
  })

  function* worker(action: CallFabricAction) {
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
      case 'member.talking': {
        const updatedAction = {
          ...action,
          payload: {
            ...action.payload,
            id: action.payload.member_id,
          },
          type: `video.${type}` as VideoMemberEventNames,
        }
        // @ts-expect-error
        yield sagaEffects.fork(videoMemberWorker, {
          ...options,
          action: updatedAction,
        })
        // @ts-expect-error
        yield sagaEffects.put(swEventChannel, updatedAction)
        break
      }
      case 'layout.changed': {
        // Upsert the layout event which is needed for rootElement
        cfRoomSession.currentLayoutEvent = action.payload
        const updatedAction = {
          ...action,
          type: `video.${type}` as 'video.layout.changed',
        }
        // TODO stop send layout events to legacy workers
        yield sagaEffects.put(swEventChannel, updatedAction)
        cfRoomSession.emit(type, payload)
        break
      }
      default:
        // @ts-expect-error
        cfRoomSession.emit(type, payload)
    }
  }

  const isSegmentEvent = (action: SDKActions) => {
    const cfAction = action as CallFabricAction
    const shouldWatch =
      cfAction.type.startsWith('call.') ||
      cfAction.type.startsWith('member.') ||
      cfAction.type.startsWith('layout.')

    return shouldWatch && segmentCallId === cfAction.payload.call_id
  }

  while (true) {
    const action: CallFabricAction = yield sagaEffects.take(
      swEventChannel,
      isSegmentEvent
    )
    yield sagaEffects.fork(worker, action)
  }
}
