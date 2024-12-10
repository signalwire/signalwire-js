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
       * A generic worker in Core, {@link memberPositionWorker}, already handles member events.
       * This worker is started within the {@link callJoinWorker} worker.
       * Therefore, these events are not handled directly in the CF SDK.
       * Instead, we map these events to Video SDK events and re-publish them on the channel,
       * ensuring they reach the generic worker.
       */
      case 'member.joined':
      case 'member.left': {
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
        const videoAction = mapFabricLayoutActionToVideoLayoutAction(action)
        yield sagaEffects.put(swEventChannel, videoAction)

        /**
         * The generic worker do not emit the "layout.changed" event.
         * We also need to update the layout event which is needed for rootElement.
         */
        cfRoomSession.currentLayoutEvent = action.payload
        cfRoomSession.emit(type, payload)
        break
      }
      /**
       * The generic worker do not handle the "member.talking" event
       */
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
