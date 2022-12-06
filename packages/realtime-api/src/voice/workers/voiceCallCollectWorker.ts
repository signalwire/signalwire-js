import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  CallingCallCollectEvent,
  MapToPubSubShape,
} from '@signalwire/core'
import { callingCollectTriggerEvent } from '../Call'
import type { Call } from '../Call'

export const voiceCallCollectWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallCollectWorker started')
  const { channels, instance, initialState } = options
  const { swEventChannel, pubSubChannel } = channels
  const { controlId } = initialState
  if (!controlId) {
    throw new Error('Missing controlId for collect')
  }

  let run = true
  const done = () => (run = false)

  while (run) {
    const action: MapToPubSubShape<CallingCallCollectEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        return (
          action.type === 'calling.call.collect' &&
          action.payload.control_id === controlId
        )
      })

    /** Add `tag` to the payload to allow pubSubSaga to match it with the Call namespace */
    const payloadWithTag = {
      tag: instance.tag,
      ...action.payload,
    }

    /**
     * Update the original CallPrompt object using the transform pipeline
     */
    yield sagaEffects.put(pubSubChannel, {
      // @ts-expect-error
      type: callingCollectTriggerEvent,
      // @ts-ignore
      payload: payloadWithTag,
    })

    /**
     * Only when partial_results: true
     */
    if (action.payload.final === false) {
      yield sagaEffects.put(pubSubChannel, {
        type: 'calling.collect.updated',
        payload: payloadWithTag,
      })
    } else {
      if (action.payload.result) {
        let typeToEmit:
          | 'calling.collect.failed'
          | 'calling.collect.ended'
          | 'calling.collect.startOfSpeech'
        switch (action.payload.result.type) {
          case 'no_match':
          case 'no_input':
          case 'error': {
            typeToEmit = 'calling.collect.failed'
            break
          }
          case 'speech':
          case 'digit': {
            typeToEmit = 'calling.collect.ended'
            break
          }
          // case 'start_of_speech': {
          //   // TODO:
          //   typeToEmit = 'calling.collect.startOfSpeech'
          //   break
          // }
        }

        if (!typeToEmit) {
          console.log('>>>> NO typeToEmit')
          continue
        }

        yield sagaEffects.put(pubSubChannel, {
          type: typeToEmit,
          payload: payloadWithTag,
        })

        /**
         * Dispatch an event to resolve `ended` in CallPrompt
         * when ended
         */
        yield sagaEffects.put(pubSubChannel, {
          type: typeToEmit,
          // @ts-ignore
          payload: {
            tag: controlId,
            ...action.payload,
          },
        })

        done()
      }
    }
  }

  getLogger().trace('voiceCallCollectWorker ended')
}
