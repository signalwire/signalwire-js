import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKActions,
  SDKWorker,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { Voice } from '../Voice'
import { handleCallConnectEvents, handleCallStateEvents } from './handlers'

interface VoiceCallConnectWorkerInitialState {
  voice: Voice
  tag: string
}

export const voiceCallConnectWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallConnectWorker started')
  const {
    channels: { swEventChannel },
    instanceMap,
    initialState,
  } = options

  const { voice, tag } = initialState as VoiceCallConnectWorkerInitialState

  const isCallConnectEvent = (action: SDKActions) =>
    action.type === 'calling.call.connect'

  const isCallStateEvent = (action: SDKActions) =>
    action.type === 'calling.call.state' &&
    action.payload.direction === 'outbound' &&
    action.payload.tag === tag

  function* callConnectWatcher(): SagaIterator {
    while (true) {
      const action = yield sagaEffects.take(swEventChannel, isCallConnectEvent)

      const shouldStop = handleCallConnectEvents({
        payload: action.payload,
        instanceMap,
        voice,
      })

      if (shouldStop) break
    }
  }

  function* callStateWatcher(): SagaIterator {
    while (true) {
      const action = yield sagaEffects.take(swEventChannel, isCallStateEvent)

      const shouldStop = handleCallStateEvents({
        payload: action.payload,
        voice,
        instanceMap,
      })

      if (shouldStop) break
    }
  }

  yield sagaEffects.fork(callConnectWatcher)
  yield sagaEffects.fork(callStateWatcher)

  getLogger().trace('voiceCallConnectWorker ended')
}
