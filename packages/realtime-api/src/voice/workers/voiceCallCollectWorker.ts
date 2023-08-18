import {
  getLogger,
  SagaIterator,
  sagaEffects,
  SDKActions,
  VoiceCallCollectAction,
  SDKWorker,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { CallCollectListeners } from '../../types'
import type { Call } from '../Call'
import { CallPrompt } from '../CallPrompt'
import { CallCollect } from '../CallCollect'

interface VoiceCallCollectWorkerInitialState {
  controlId: string
  listeners?: CallCollectListeners
}

export const voiceCallCollectWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallCollectWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set, remove },
    initialState,
  } = options

  const { controlId } = initialState as VoiceCallCollectWorkerInitialState

  function* worker(action: VoiceCallCollectAction) {
    const { payload } = action

    if (payload.control_id !== controlId) return

    const callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      throw new Error('Missing call instance for collect')
    }

    const actionInstance = get<CallPrompt | CallCollect>(payload.control_id)
    if (!actionInstance) {
      throw new Error('Missing the instance')
    }
    actionInstance.setPayload(payload)
    set<CallPrompt | CallCollect>(payload.control_id, actionInstance)

    let eventPrefix = 'collect' as 'collect' | 'prompt'
    if (actionInstance instanceof CallPrompt) {
      eventPrefix = 'prompt'
    }

    /**
     * Only when partial_results: true
     */
    if (payload.final === false) {
      callInstance.emit(`${eventPrefix}.updated`, actionInstance)
      actionInstance.emit(`${eventPrefix}.updated` as never, actionInstance)
      return false
    }

    switch (payload.result.type) {
      case 'start_of_input': {
        if (eventPrefix === 'prompt') return false
        callInstance.emit(`${eventPrefix}.startOfInput`, actionInstance)
        actionInstance.emit(
          `${eventPrefix}.startOfInput` as never,
          actionInstance
        )
        return false
      }
      case 'no_input':
      case 'no_match':
      case 'error': {
        callInstance.emit(`${eventPrefix}.failed`, actionInstance)
        actionInstance.emit(`${eventPrefix}.failed` as never, actionInstance)
        remove<CallPrompt | CallCollect>(payload.control_id)
        return true
      }
      case 'speech':
      case 'digit': {
        callInstance.emit(`${eventPrefix}.ended`, actionInstance)
        actionInstance.emit(`${eventPrefix}.ended` as never, actionInstance)
        remove<CallPrompt | CallCollect>(payload.control_id)
        return false
      }
      default:
        getLogger().warn(
          // @ts-expect-error
          `Unknown prompt result type: "${payload.result.type}"`
        )
        return false
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => action.type === 'calling.call.collect'
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallCollectWorker ended')
}
