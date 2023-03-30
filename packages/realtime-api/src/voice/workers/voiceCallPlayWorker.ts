import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  CallingCallPlayEvent,
  MapToPubSubShape,
} from '@signalwire/core'
import type { Call } from '../Call'
import { callingPlaybackTriggerEvent } from '../Call'

export const voiceCallPlayWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallPlayWorker started')
  const { channels, instance, initialState } = options
  const { swEventChannel, pubSubChannel } = channels
  const { controlId } = initialState
  if (!controlId) {
    throw new Error('Missing controlId for playback')
  }

  let paused = false
  let run = true
  const done = () => (run = false)

  while (run) {
    const action: MapToPubSubShape<CallingCallPlayEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        return (
          action.type === 'calling.call.play' &&
          action.payload.control_id === controlId
        )
      })

    /** Add `tag` to the payload to allow pubSubSaga to match it with the Call namespace */
    const payloadWithTag = {
      tag: instance.tag,
      ...action.payload,
    }

    /**
     * Update the original CallPlayback object using the
     * transform pipeline
     */
    yield sagaEffects.put(pubSubChannel, {
      // @ts-ignore
      type: callingPlaybackTriggerEvent,
      // @ts-ignore
      payload: payloadWithTag,
    })

    /** Update the original CallPlayback object through the control_id */
    yield sagaEffects.put(pubSubChannel, {
      // @ts-ignore
      type: `calling.call.play.${action.payload.control_id}`,
      // @ts-ignore
      payload: payloadWithTag,
    })

    switch (action.payload.state) {
      case 'playing': {
        const type = paused
          ? 'calling.playback.updated'
          : 'calling.playback.started'
        paused = false

        yield sagaEffects.put(pubSubChannel, {
          type,
          payload: payloadWithTag,
        })
        break
      }
      case 'paused': {
        paused = true

        yield sagaEffects.put(pubSubChannel, {
          type: 'calling.playback.updated',
          payload: payloadWithTag,
        })
        break
      }
      case 'error': {
        yield sagaEffects.put(pubSubChannel, {
          type: 'calling.playback.failed',
          payload: payloadWithTag,
        })

        /**
         * Dispatch an event to resolve `ended()` in CallPlayback
         * when ended
         */
        yield sagaEffects.put(pubSubChannel, {
          type: 'calling.playback.ended',
          payload: {
            ...action.payload,
            tag: controlId,
          },
        })

        done()
        break
      }
      case 'finished': {
        yield sagaEffects.put(pubSubChannel, {
          type: 'calling.playback.ended',
          payload: payloadWithTag,
        })

        /**
         * Dispatch an event to resolve `ended()` in CallPlayback
         * when ended
         */
        yield sagaEffects.put(pubSubChannel, {
          type: 'calling.playback.ended',
          // @ts-ignore
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

  getLogger().trace('voiceCallPlayWorker ended')
}
