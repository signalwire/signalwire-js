import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  CallingCallDetectEvent,
  MapToPubSubShape,
} from '@signalwire/core'
import { callingDetectTriggerEvent } from '../Call'
import type { Call } from '../Call'

export const voiceCallDetectWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallDetectWorker started')
  const { channels, instance, payload } = options
  const { swEventChannel, pubSubChannel } = channels
  const { controlId } = payload
  if (!controlId) {
    throw new Error('Missing controlId for tapping')
  }

  let run = true
  const done = () => (run = false)

  while (run) {
    const action: MapToPubSubShape<CallingCallDetectEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        return (
          action.type === 'calling.call.detect' &&
          action.payload.control_id === controlId
        )
      })

    /** Add `tag` to the payload to allow pubSubSaga to match it with the Call namespace */
    const payloadWithTag = {
      tag: instance.tag,
      ...action.payload,
    }

    /**
     * Update the original CallDetect object using the transform pipeline
     */
    yield sagaEffects.put(pubSubChannel, {
      // @ts-ignore
      type: callingDetectTriggerEvent,
      // @ts-ignore
      payload: payloadWithTag,
    })

    const { detect } = action.payload
    if (!detect) {
      continue
    }

    switch (detect.type) {
      case 'fax': {
        // yield sagaEffects.put(pubSubChannel, {
        //   type: 'calling.tap.started',
        //   payload: payloadWithTag,
        // })
        break
      }
      case 'digit': {
        // yield sagaEffects.put(pubSubChannel, {
        //   type: 'calling.tap.ended',
        //   payload: payloadWithTag,
        // })
        break
      }
      case 'machine': {
        // yield sagaEffects.put(pubSubChannel, {
        //   type: 'calling.tap.ended',
        //   payload: payloadWithTag,
        // })
        break
      }
    }

    if (detect.params.event === 'error') {
      // yield sagaEffects.put(pubSubChannel, {
      //   type: 'calling.tap.ended',
      //   payload: payloadWithTag,
      // })
      done()
    }
    if (detect.params.event === 'finished') {
      // yield sagaEffects.put(pubSubChannel, {
      //   type: 'calling.tap.ended',
      //   payload: payloadWithTag,
      // })
      done()
    }
  }

  getLogger().trace('voiceCallDetectWorker ended')
}
