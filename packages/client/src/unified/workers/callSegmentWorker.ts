import {
  CallJoinedEvent,
  SDKActions,
  SagaIterator,
  getLogger,
  sagaEffects,
  ProgrammableCallsAction,
} from '@signalwire/core'
import { callLeftWorker } from './callLeftWorker'
import { callJoinWorker } from './callJoinWorker'
import { ProgrammableCallsWorkerParams } from './fabricWorker'
import {
  mapProgrammableCallsLayoutActionToVideoLayoutAction,
  mapMemberActionToVideoMemberJoinAndLeftAction,
  mapMemberActionToVideoMemberUpdatedAction,
} from '../utils/eventMappers'
import { fabricMemberWorker } from './fabricMemberWorker'

export const callSegmentWorker = function* (
  options: ProgrammableCallsWorkerParams<CallJoinedEvent>
): SagaIterator {
  const {
    action,
    channels: { swEventChannel },
    instance: cfRoomSession,
  } = options
  const segmentCallId = action.payload.call_id
  const segmentRooSessionId = action.payload.room_session_id

  getLogger().debug(
    `callSegmentWorker started for: callId ${segmentCallId}, roomSessionId ${segmentRooSessionId}`
  )

  // Handles the `call.joined` event before the worker loop
  yield sagaEffects.fork(callJoinWorker, {
    ...options,
    action,
  })

  function* worker(action: ProgrammableCallsAction) {
    const { type, payload } = action

    switch (type) {
      case 'call.joined':
        /** NOOP since this event is handled by the {@link fabricWorker} */
        break
      case 'call.left':
        // Wait for the `callLeftWorker` to finish and then stop this particular segment worker
        yield sagaEffects.call(callLeftWorker, {
          ...options,
          action,
        })
        return true
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
          mapMemberActionToVideoMemberJoinAndLeftAction(action)
        yield sagaEffects.put(swEventChannel, videoAction)
        break
      }
      case 'member.updated': {
        const videoAction = mapMemberActionToVideoMemberUpdatedAction(action)
        yield sagaEffects.put(swEventChannel, videoAction)
        break
      }
      case 'layout.changed': {
        // We need to update the layout event which is needed for rootElement.
        cfRoomSession.currentLayoutEvent = action.payload
        cfRoomSession.emit(type, payload)
        const videoAction =
          mapProgrammableCallsLayoutActionToVideoLayoutAction(action)
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

    return false
  }

  const isSegmentEvent = (action: SDKActions) => {
    const { type, payload } = action as ProgrammableCallsAction
    const shouldWatch =
      type.startsWith('call.') ||
      type.startsWith('member.') ||
      type.startsWith('layout.')
    const hasSegmentCallId =
      'call_id' in payload && segmentCallId === payload.call_id
    const hasSegmentRoomSessionId =
      segmentRooSessionId === payload.room_session_id

    if (shouldWatch && (hasSegmentCallId || hasSegmentRoomSessionId)) {
      return true
    }

    return false
  }

  while (true) {
    const action: ProgrammableCallsAction = yield sagaEffects.take(
      swEventChannel,
      isSegmentEvent
    )
    const task = yield sagaEffects.fork(worker, action)

    /**
     * Wait for `worker` to finish and get its return value
     * Stop the `callSegmentWorker' if the returned value is true
     */
    const shouldStop = yield sagaEffects.join(task)
    if (shouldStop) return
  }
}
