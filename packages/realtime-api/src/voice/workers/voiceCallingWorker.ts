import {
  SagaIterator,
  SDKWorker,
  getLogger,
  sagaEffects,
  SDKActions,
} from '@signalwire/core'
import { fork } from '@redux-saga/core/effects'
import type { Client } from '../../client/index'
import { voiceCallReceiveWorker } from './voiceCallReceiveWorker'
import { voiceCallPlayWorker } from './voiceCallPlayWorker'
import { voiceCallRecordWorker } from './voiceCallRecordWorker'

export const voiceCallingWroker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallingWroker started')
  const { channels, instance, instanceMap } = options
  const { swEventChannel } = channels

  while (true) {
    // @TODO: Proper TS
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => {
        return action.type.startsWith('calling.')
      }
    )

    switch (action.type) {
      case 'calling.call.receive':
        yield fork(voiceCallReceiveWorker, {
          client: instance,
          instanceMap,
          payload: action.payload,
        })
        break
      case 'calling.call.play':
        yield fork(voiceCallPlayWorker, {
          client: instance,
          instanceMap,
          payload: action.payload,
        })
        break
      case 'calling.call.record':
        yield fork(voiceCallRecordWorker, {
          client: instance,
          instanceMap,
          payload: action.payload,
        })
        break
      default:
        break
    }
  }
}
