import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  CallingCallStateEvent,
  toSyntheticEvent,
  MapToPubSubShape,
} from '@signalwire/core'
import { Client } from '../client/index'
import { createCallObject, Call } from './Call'

export const SYNTHETIC_CALL_STATE_ANSWERED_EVENT = toSyntheticEvent(
  'calling.call.answered'
)

// export const SYNTHETIC_CALL_STATE_FAILED_EVENT = toSyntheticEvent(
//   'calling.call.failed'
// )

export const SYNTHETIC_CALL_STATE_ENDED_EVENT =
  toSyntheticEvent('calling.call.ended')

const TARGET_CALL_STATES = ['answered', 'failed', 'ended']

export const voiceCallStateWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  const { channels, instance } = options
  const { swEventChannel, pubSubChannel } = channels
  getLogger().trace('voiceCallStateWorker started')

  let isDone = false
  while (!isDone) {
    const action: MapToPubSubShape<CallingCallStateEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        return (
          action.type === 'calling.call.state' &&
          (instance.id === action.payload.call_id ||
            instance.tag === action.payload.tag) &&
          TARGET_CALL_STATES.includes(action.payload.call_state)
        )
      })

    // Inject `tag` to have our EE to work because inbound calls don't have tags.
    const newPayload = {
      tag: instance.tag,
      ...action.payload,
    }

    if (action.payload.call_state === 'answered') {
      yield sagaEffects.put(pubSubChannel, {
        // @ts-expect-error
        type: SYNTHETIC_CALL_STATE_ANSWERED_EVENT,
        payload: newPayload,
      })
    } else if (action.payload.call_state === 'ended') {
      isDone = true

      yield sagaEffects.put(pubSubChannel, {
        // @ts-expect-error
        type: SYNTHETIC_CALL_STATE_ENDED_EVENT,
        payload: newPayload,
      })
    } else {
      throw new Error('[voiceCallStateWorker] unhandled call_state')
    }
  }
  getLogger().trace('voiceCallStateWorker ended')
}

export const voiceCallReceiveWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallReceiveWorker started')
  const { channels, instance } = options
  const { swEventChannel, pubSubChannel } = channels
  // contexts is required
  const { contexts = [] } = instance?.options ?? {}
  if (!contexts.length) {
    throw new Error('Invalid contexts to receive inbound calls')
  }

  while (true) {
    const action = yield sagaEffects.take(swEventChannel, (action: any) => {
      return (
        action.type === 'calling.call.receive' &&
        contexts.includes(action.payload.context)
      )
    })

    const call = createCallObject({
      store: instance.store,
      // @ts-expect-error
      emitter: instance.emitter,
    })
    call.callId = action.payload.call_id
    call.nodeId = action.payload.node_id

    yield sagaEffects.put(pubSubChannel, {
      // @ts-expect-error
      type: 'call.received',
      // @ts-expect-error
      payload: call,
    })
  }

  getLogger().trace('voiceCallReceiveWorker ended')
}
