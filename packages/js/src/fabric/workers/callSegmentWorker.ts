import {
  FabricAction,
  CallJoinedEvent,
  SDKActions,
  SagaIterator,
  getLogger,
  sagaEffects,
} from '@signalwire/core'
import { callLeftWorker } from './callLeftWorker'
import { callJoinWorker } from './callJoinWorker'
import { FabricWorkerParams } from './fabricWorker'
import {
  mapFabricLayoutActionToVideoLayoutAction,
  mapFabricMemberActionToVideoMemberJoinAndLeftAction,
  mapFabricMemberActionToVideoMemberUpdatedAction,
} from '../utils/helpers'
import { fabricMemberWorker } from './fabricMemberWorker'

export const callSegmentWorker = function* (
  options: FabricWorkerParams<CallJoinedEvent>
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

  function* worker(action: FabricAction) {
    const { type, payload } = action

    switch (type) {
      case 'call.joined':
        getLogger().warn('Got a repeated call.joined event', action)
        break
      case 'call.left':
        yield sagaEffects.fork(callLeftWorker, {
          ...options,
          action,
        })
        break
      case 'call.updated':
        cfRoomSession.emit(type, payload)
        cfRoomSession.emit('room.updated', payload)
        break
      case 'call.play':
        cfRoomSession.emit(type, payload)
        break
      case 'call.connect':
        cfRoomSession.emit(type, payload)
        break
      case 'call.room':
        cfRoomSession.emit(type, payload)
        break

      /**
       * The Core module includes a generic worker, {@link memberPositionWorker},
       * which listens for member & layout events to add a "current_position" parameter
       * and handle member "updated" parameter.
       * This worker in CF SDK is initialized by the {@link callJoinWorker} worker.
       *
       * To ensure compatibility, we map these events to Video SDK events and
       * re-publish them on the channel so that they can be processed by the
       * generic worker. Note that the generic worker only dispatches "member.updated"
       * and "member.updated.*" events.
       *
       * Additionally, the "member.joined" event is monitored by another worker,
       * {@link childMemberJoinedWorker}, specifically for the screen share API.
       */
      case 'member.joined':
      case 'member.left': {
        yield sagaEffects.fork(fabricMemberWorker, {
          ...options,
          action,
        })
        const videoAction =
          mapFabricMemberActionToVideoMemberJoinAndLeftAction(action)
        yield sagaEffects.put(swEventChannel, videoAction)
        break
      }
      case 'member.updated': {
        const videoAction =
          mapFabricMemberActionToVideoMemberUpdatedAction(action)
        yield sagaEffects.put(swEventChannel, videoAction)
        break
      }
      case 'layout.changed': {
        // We need to update the layout event which is needed for rootElement.
        cfRoomSession.currentLayoutEvent = action.payload
        cfRoomSession.emit(type, payload)
        const videoAction = mapFabricLayoutActionToVideoLayoutAction(action)
        yield sagaEffects.put(swEventChannel, videoAction)
        break
      }
      case 'member.talking': {
        yield sagaEffects.fork(fabricMemberWorker, {
          ...options,
          action,
        })
        break
      }
      default: {
        getLogger().warn('Got an unknown fabric event', action)
      }
    }
  }

  const isSegmentEvent = (action: SDKActions) => {
    const cfAction = action as FabricAction
    return (
      cfAction.type.startsWith('call.') ||
      cfAction.type.startsWith('member.') ||
      cfAction.type.startsWith('layout.')
    )

    // FIXME: Many events do not have the call_id property
    // return shouldWatch && segmentCallId === cfAction.payload.call_id
  }

  while (true) {
    const action: FabricAction = yield sagaEffects.take(
      swEventChannel,
      isSegmentEvent
    )
    yield sagaEffects.fork(worker, action)
  }
}
