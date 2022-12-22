import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
} from '@signalwire/core'
import type { Client } from '../Voice'

export const voiceClientWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().info('voiceClientWorker started')
  const { channels } = options
  const { swEventChannel, pubSubChannel } = channels

  function* worker(payload: any) {
    yield sagaEffects.put(pubSubChannel, {
      // @ts-expect-error
      type: `calling.call.state.${payload.call_id}`,
      payload,
    })
  }
  /**
   * Simply emit all "calling.call.state" events to our pubSubSaga
   * to reach the Voice Client listeners and update the state of
   * the Call instances created within `calling.call.receive` events.
   */
  while (true) {
    const action = yield sagaEffects.take(swEventChannel, 'calling.call.state')
    // Non-blocking fork ..
    yield sagaEffects.fork(worker, action.payload)
  }

  getLogger().info('voiceClientWorker ended')
}
