import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  CallingCallConnectEvent,
  MapToPubSubShape,
} from '@signalwire/core'
import type { Call } from '../Call'

export const voiceCallConnectWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallConnectWorker started')
  const { channels, instance } = options
  const { swEventChannel, pubSubChannel } = channels

  let run = true
  const done = () => (run = false)

  while (run) {
    const action: MapToPubSubShape<CallingCallConnectEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        return (
          action.type === 'calling.call.connect' &&
          action.payload.tag === instance.tag
        )
      })

    /**
     * Dispatch public events for each connect_state
     */
    yield sagaEffects.put(pubSubChannel, {
      type: `calling.connect.${action.payload.connect_state}`,
      payload: action.payload,
    })

    switch (action.payload.connect_state) {
      case 'connected': {
        /**
         * Update the Call object payload with the new state
         */
        yield sagaEffects.put(pubSubChannel, {
          type: 'calling.call.state',
          payload: {
            call_id: instance.callId,
            call_state: instance.state,
            context: instance.context,
            tag: instance.tag,
            direction: instance.direction,
            device: instance.device,
            node_id: instance.nodeId,
            peer: action.payload.peer,
          },
        })
        break
      }
      case 'disconnected':
      case 'failed': {
        done()
        break
      }
    }
  }

  getLogger().trace('voiceCallConnectWorker ended')
}
