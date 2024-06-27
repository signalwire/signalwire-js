import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  CallStateEvent,
} from '@signalwire/core'
import { CallFabricWorkerParams } from './callFabricWorker'

export const callStateWorker = function* (
  options: CallFabricWorkerParams<MapToPubSubShape<CallStateEvent>>
): SagaIterator {
  getLogger().trace('callStateWorker started')

  const {
    instance: cfRoomSession,
    action: { payload },
  } = options

  switch (payload.call_state) {
    case 'ended': {
      // @ts-expect-error
      cfRoomSession.emit('call.state', payload)
      // Perfrom the SDK cleanup if callSegments are empty and state is 'destroy'
      const eventRoutingId = payload.room_session_id || payload.call_id
      if (eventRoutingId === payload.origin_call_id) {
        cfRoomSession.destroy()
      }
      break
    }
    default:
      // @ts-expect-error
      cfRoomSession.emit('call.state', payload)
      break
  }

  getLogger().trace('callStateWorker ended')
}
