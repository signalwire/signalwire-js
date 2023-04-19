import {
  SagaIterator,
  SDKWorker,
  getLogger,
  sagaEffects,
  SDKActions,
  VoiceCallAction,
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
import { voiceCallTapWorker } from './voiceCallTapWorker'
import { voiceCallConnectWorker } from './voiceCallConnectWorker'
import { voiceSDKCallPromptWorker } from './voiceSDKCallPromptWorker'
import { voiceSDKCallCollectWorker } from './voiceSDKCallCollectWorker'
import { voiceSDKCallDetectWorker } from './voiceSDKCallDetectWorker'

export const voiceCallingWroker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallingWroker started')
  const { channels, instance, instanceMap, initialState } = options
  const { swEventChannel } = channels

  function* worker(action: VoiceCallAction) {
    const { type } = action

    switch (type) {
      case 'calling.call.state':
        yield fork(voiceCallStateWorker, {
          client: instance,
          initialState,
          instanceMap,
          action,
        })
        break
      case 'calling.call.dial':
        yield fork(voiceCallDialWorker, {
          client: instance,
          initialState,
          instanceMap,
          action,
        })
        break
      case 'calling.call.receive':
        yield fork(voiceCallReceiveWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.call.play':
        yield fork(voiceCallPlayWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.call.record':
        yield fork(voiceCallRecordWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.call.collect':
        yield fork(voiceCallCollectWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.call.send_digits':
        yield fork(voiceCallSendDigitsWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.call.detect':
        yield fork(voiceCallDetectWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.call.tap':
        yield fork(voiceCallTapWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.call.connect':
        yield fork(voiceCallConnectWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.sdk.prompt':
        yield fork(voiceSDKCallPromptWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.sdk.collect':
        yield fork(voiceSDKCallCollectWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      case 'calling.sdk.detect':
        yield fork(voiceSDKCallDetectWorker, {
          client: instance,
          instanceMap,
          action,
        })
        break
      default:
        getLogger().warn(`Unknown call event: "${type}"`)
        break
    }
  }

  const isCallingEvent = (action: SDKActions) =>
    action.type.startsWith('calling.')

  while (true) {
    const action: VoiceCallAction = yield sagaEffects.take(
      swEventChannel,
      isCallingEvent
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('voiceCallingWroker ended')
}
