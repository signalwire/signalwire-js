import {
  SagaIterator,
  SDKWorker,
  getLogger,
  sagaEffects,
  SDKActions,
  MapToPubSubShape,
  SwEventParams,
} from '@signalwire/core'
import { fork } from '@redux-saga/core/effects'
import type { Client } from '../../client/index'
import { voiceCallReceiveWorker } from './voiceCallReceiveWorker'
import { voiceCallPlayWorker } from './voiceCallPlayWorker'
import { voiceCallRecordWorker } from './voiceCallRecordWorker'
import { voiceCallDialWorker } from './voiceCallDialWorker'
import { voiceCallStateWorker } from './voiceCallStateWorker'
import { voiceCallCollectWorker } from './voiceCallCollectWorker'
import { voiceCallSendDigitsWorker } from './VoiceCallSendDigitWorker'
import { voiceCallDetectWorker } from './voiceCallDetectWorker'

export const voiceCallingWroker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallingWroker started')
  const { channels, instance, instanceMap, initialState } = options
  const { swEventChannel } = channels

  function* worker(action: MapToPubSubShape<SwEventParams>) {
    switch (action.type) {
      case 'calling.call.state':
        yield fork(voiceCallStateWorker, {
          client: instance,
          initialState,
          instanceMap,
          payload: action.payload,
        })
        break
      case 'calling.call.dial':
        yield fork(voiceCallDialWorker, {
          client: instance,
          initialState,
          instanceMap,
          payload: action.payload,
        })
        break
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
      case 'calling.call.collect':
        yield fork(voiceCallCollectWorker, {
          client: instance,
          instanceMap,
          payload: action.payload,
        })
        break
      case 'calling.call.send_digits':
        yield fork(voiceCallSendDigitsWorker, {
          client: instance,
          instanceMap,
          payload: action.payload,
        })
        break
      case 'calling.call.detect':
        yield fork(voiceCallDetectWorker, {
          client: instance,
          instanceMap,
          payload: action.payload,
        })
        break
      default:
        getLogger().info(`Unknown call event: "${action.type}"`)
        break
    }
  }

  while (true) {
    const action: MapToPubSubShape<SwEventParams> = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => {
        return action.type.startsWith('calling.')
      }
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('voiceCallingWroker ended')
}
