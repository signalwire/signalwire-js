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

export const voiceCallPlayWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallPlayWorker started')
  const { channels, instance, payload } = options
  const { swEventChannel, pubSubChannel } = channels
  const { controlId } = payload
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
    switch (action.payload.state) {
      case 'playing': {
        const type = paused
          ? 'calling.playback.updated'
          : 'calling.playback.started'
        paused = false

        yield sagaEffects.put(pubSubChannel, {
          // @ts-expect-error
          type,
          // @ts-ignore
          payload: {
            // @ts-expect-error
            tag: instance.tag,
            ...action.payload,
          },
        })
        break
      }
      case 'paused': {
        paused = true

        yield sagaEffects.put(pubSubChannel, {
          // @ts-expect-error
          type: 'calling.playback.updated',
          // @ts-ignore
          payload: {
            // @ts-expect-error
            tag: instance.tag,
            ...action.payload,
          },
        })
        break
      }
      case 'error':
        // TODO: dispatch calling.playback.error ?
        break
      case 'finished': {
        yield sagaEffects.put(pubSubChannel, {
          // @ts-expect-error
          type: 'calling.playback.ended',
          // @ts-ignore
          payload: {
            // @ts-expect-error
            tag: instance.tag,
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
