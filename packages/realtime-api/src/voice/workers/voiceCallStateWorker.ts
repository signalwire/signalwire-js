import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  CallingCallStateEvent,
  MapToPubSubShape,
} from '@signalwire/core'
import type { Call } from '../Call'

export const voiceCallStateWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  const { channels, instance } = options
  const { swEventChannel, pubSubChannel } = channels
  getLogger().trace('voiceCallStateWorker started', instance.id, instance.tag)

  let run = true
  const done = () => (run = false)

  while (run) {
    const action: MapToPubSubShape<CallingCallStateEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        if (action.type === 'calling.call.state') {
          // To avoid mixing events on `connect` we check for `instance.id`
          // if there's already a callId value.
          if (instance.id) {
            return instance.id === action.payload.call_id
          }
          return instance.tag === action.payload.tag
        }
        return false
      })

    // Inject `tag` to have our EE to work because inbound
    // calls don't have tags.
    const newPayload = {
      ...action.payload,
      tag: instance.tag,
    }

    /**
     * Update the Call object payload with the new state
     */
    yield sagaEffects.put(pubSubChannel, {
      type: 'calling.call.state',
      payload: newPayload,
    })

    if (newPayload.call_state === 'ended') {
      done()
    }
  }

  getLogger().info('voiceCallStateWorker ended', instance.id, instance.tag)
}
