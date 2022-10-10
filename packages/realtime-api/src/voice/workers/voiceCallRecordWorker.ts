import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  CallingCallRecordEvent,
  MapToPubSubShape,
} from '@signalwire/core'
import { callingRecordTriggerEvent } from '../Call'
import type { Call } from '../Call'

export const voiceCallRecordWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallRecordWorker started')
  const { channels, instance, initialState } = options
  const { swEventChannel, pubSubChannel } = channels
  const { controlId } = initialState
  if (!controlId) {
    throw new Error('Missing controlId for recording')
  }

  let run = true
  const done = () => (run = false)

  while (run) {
    const action: MapToPubSubShape<CallingCallRecordEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        return (
          action.type === 'calling.call.record' &&
          action.payload.control_id === controlId
        )
      })

    /** Add `tag` to the payload to allow pubSubSaga to match it with the Call namespace */
    const payloadWithTag = {
      tag: instance.tag,
      ...action.payload,
    }

    /**
     * Update the original CallRecording object using the
     * transform pipeline
     */
    yield sagaEffects.put(pubSubChannel, {
      // @ts-ignore
      type: callingRecordTriggerEvent,
      // @ts-ignore
      payload: payloadWithTag,
    })

    switch (action.payload.state) {
      case 'recording': {
        yield sagaEffects.put(pubSubChannel, {
          type: 'calling.recording.started',
          payload: payloadWithTag,
        })
        break
      }

      case 'no_input':
      case 'finished': {
        const typeToEmit =
          action.payload.state === 'finished'
            ? 'calling.recording.ended'
            : 'calling.recording.failed'

        yield sagaEffects.put(pubSubChannel, {
          type: typeToEmit,
          payload: payloadWithTag,
        })

        /**
         * Dispatch an event to resolve `ended()` in CallRecord
         * when ended
         */
        yield sagaEffects.put(pubSubChannel, {
          type: typeToEmit,
          payload: {
            tag: controlId,
            ...action.payload,
          },
        })

        done()
        break
      }
    }
  }

  getLogger().trace('voiceCallRecordWorker ended')
}
