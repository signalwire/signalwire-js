import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { createCallObject } from '../Call'

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
