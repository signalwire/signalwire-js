import {
  CallingCall,
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
} from '@signalwire/core'
import { fork } from '@redux-saga/core/effects'
import type { Client } from '../../client/index'
import { createCallObject } from '../Call'

export const voiceCallReceiveWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallReceiveWorker started')
  const { channels, instance } = options
  const { swEventChannel } = channels
  // contexts is required
  const { contexts = [] } = instance?.options ?? {}
  if (!contexts.length) {
    throw new Error('Invalid contexts to receive inbound calls')
  }

  function* worker(payload: CallingCall) {
    const callInstance = createCallObject({
      store: instance.store,
      // @ts-expect-error
      emitter: instance.emitter,
      payload,
    })
    instance.baseEmitter.emit('call.received', callInstance)
  }

  while (true) {
    const action = yield sagaEffects.take(swEventChannel, (action: any) => {
      return (
        action.type === 'calling.call.receive' &&
        contexts.includes(action.payload.context)
      )
    })

    yield fork(worker, action.payload)
  }
}
