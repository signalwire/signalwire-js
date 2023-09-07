import {
  SagaIterator,
  SDKWorker,
  getLogger,
  sagaEffects,
  SDKActions,
  VoiceCallAction,
  SDKWorkerParams,
  sagaHelpers,
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

export type VoiceCallWorkerParams<T> = Omit<
  SDKWorkerParams<Client>,
  'runSaga' | 'getSession' | 'payload'
> & { payload: T }

export const voiceCallingWroker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallingWroker started')
  const {
    channels: { swEventChannel },
  } = options

  function* worker(action: VoiceCallAction) {
    const { type, payload } = action

    switch (type) {
      case 'calling.call.state':
        yield fork(voiceCallStateWorker, {
          ...options,
          payload,
        })
        break
      case 'calling.call.dial':
        yield fork(voiceCallDialWorker, {
          ...options,
          payload,
        })
        break
      case 'calling.call.receive':
        yield fork(voiceCallReceiveWorker, {
          ...options,
          payload,
        })
        break
      case 'calling.call.play':
        yield fork(voiceCallPlayWorker, {
          ...options,
          payload,
        })
        break
      case 'calling.call.record':
        yield fork(voiceCallRecordWorker, {
          ...options,
          payload,
        })
        break
      case 'calling.call.collect':
        yield fork(voiceCallCollectWorker, {
          ...options,
          payload,
        })
        break
      case 'calling.call.send_digits':
        yield fork(voiceCallSendDigitsWorker, {
          ...options,
          payload,
        })
        break
      case 'calling.call.detect':
        yield fork(voiceCallDetectWorker, {
          ...options,
          payload,
        })
        break
      case 'calling.call.tap':
        yield fork(voiceCallTapWorker, {
          ...options,
          payload,
        })
        break
      case 'calling.call.connect':
        yield fork(voiceCallConnectWorker, {
          ...options,
          payload,
        })
        break
      default:
        getLogger().warn(`Unknown call event: "${type}"`)
        break
    }
  }

  const workerCatchable = sagaHelpers.createCatchableSaga<VoiceCallAction>(
    worker,
    (error) => {
      getLogger().error('Voice calling event error', error)
    }
  )

  const isCallingEvent = (action: SDKActions) =>
    action.type.startsWith('calling.')

  while (true) {
    const action: VoiceCallAction = yield sagaEffects.take(
      swEventChannel,
      isCallingEvent
    )

    yield sagaEffects.fork(workerCatchable, action)
  }

  getLogger().trace('voiceCallingWroker ended')
}
