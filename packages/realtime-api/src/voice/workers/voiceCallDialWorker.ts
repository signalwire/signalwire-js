import {
  getLogger,
  SagaIterator,
  SDKWorker,
  sagaEffects,
  SDKActions,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { RealTimeCallListeners } from '../../types'
import { Voice } from '../Voice'
import { handleCallDialEvents, handleCallStateEvents } from './handlers'

interface VoiceCallDialWorkerInitialState {
  tag: string
  voice: Voice
  listeners?: RealTimeCallListeners
}

export const voiceCallDialWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallDialWorker started')
  const {
    instanceMap,
    channels: { swEventChannel },
    initialState,
  } = options

  const { tag, voice, listeners } =
    initialState as VoiceCallDialWorkerInitialState

  const isCallDialEvent = (action: SDKActions) => {
    return action.type === 'calling.call.dial' && action.payload.tag === tag
  }

  const isCallStateEvent = (action: SDKActions) => {
    return (
      action.type === 'calling.call.state' &&
      action.payload.direction === 'outbound' &&
      action.payload.tag === tag
    )
  }

  function* callDialWatcher(): SagaIterator {
    while (true) {
      const action = yield sagaEffects.take(swEventChannel, isCallDialEvent)

      const shouldStop = handleCallDialEvents({
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
        listeners,
      })

      if (shouldStop) break
    }
  }

  yield sagaEffects.fork(callDialWatcher)
  yield sagaEffects.fork(callStateWatcher)

  getLogger().trace('voiceCallDialWorker ended')
}
