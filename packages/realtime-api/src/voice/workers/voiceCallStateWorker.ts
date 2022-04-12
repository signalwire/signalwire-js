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
  while (run) {
    const action: MapToPubSubShape<CallingCallStateEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        if (action.type === 'calling.call.state') {
          // TODO: Temp fix.
          if (['ended', 'ending'].includes(action.payload.call_state)) {
            console.log(
              '>> Call ending, skipping',
              JSON.stringify(
                {
                  id: instance.id,
                  tag: instance.tag,
                  action,
                },
                null,
                2
              )
            )

            return false
          }

          // To avoid mixing events on `connect` we check for `instance.id`
          // if there's already a callId value.
          if (instance.id) {
            console.log(
              '---> instance.id branch',
              JSON.stringify(
                {
                  id: instance.id,
                  tag: instance.tag,
                  callId: action.payload.call_id,
                  // @ts-expect-error
                  perr: instance.peer,
                  payload: action.payload,
                },
                null,
                2
              )
            )

            return instance.id === action.payload.call_id
          }
          console.log(
            '---> tag branch',
            JSON.stringify(
              {
                id: instance.id,
                tag: instance.tag,
                callId: action.payload.tag,
                // @ts-expect-error
                perr: instance.peer,
                payload: action.payload,
              },
              null,
              2
            )
          )
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
  }

  getLogger().info('voiceCallStateWorker ended', instance.id, instance.tag)
}
