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
    callSegments,
  } = options

  switch (payload.call_state) {
    case 'ended': {
      // @ts-expect-error
      cfRoomSession.emit('call.state', payload)
      // Perfrom the SDK cleanup if callSegments are empty and state is 'destroy'
      // @ts-expect-error
      if (callSegments.length < 1 && cfRoomSession.state === 'destroy') {
        console.log('>> destroy')
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
