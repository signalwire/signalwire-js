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

    // These two variables are here to solve the TypeScript problems
    const promptInstance: CallPrompt = actionInstance as CallPrompt
    const collectInstance: CallCollect = actionInstance as CallCollect

    /**
     * Only when partial_results: true
     */
    if (payload.final === false) {
      if (eventPrefix === 'prompt') {
        callInstance._emit('prompt.updated', promptInstance)
        promptInstance._emit('prompt.updated', promptInstance)
      } else {
        callInstance._emit('collect.updated', collectInstance)
        collectInstance._emit('collect.updated', collectInstance)
      }
      return false
    } else if (payload.final === true && payload.state == "collecting") {
      // Even if final is true but we are still collecting, we want an update
      if (eventPrefix === 'prompt') {
        callInstance._emit('prompt.updated', promptInstance)
        promptInstance._emit('prompt.updated', promptInstance)
      } else {
        callInstance._emit('collect.updated', collectInstance)
        collectInstance._emit('collect.updated', collectInstance)
      }
    }

    switch (payload.result.type) {
      case 'start_of_input': {
        if (eventPrefix === 'prompt') return false
        callInstance._emit('collect.startOfInput', collectInstance)
        collectInstance._emit('collect.startOfInput', collectInstance)
        return false
      }
      case 'no_input':
      case 'no_match':
      case 'error': {
        if (payload.state === 'collecting') return false

        if (eventPrefix === 'prompt') {
          callInstance._emit('prompt.failed', promptInstance)
          promptInstance._emit('prompt.failed', promptInstance)
        } else {
          callInstance._emit('collect.failed', collectInstance)
          collectInstance._emit('collect.failed', collectInstance)
        }
        remove<CallPrompt | CallCollect>(payload.control_id)

        return true
      }
      case 'speech':
      case 'digit': {
        if (payload.state === 'collecting') return false

        if (eventPrefix === 'prompt') {
          callInstance._emit('prompt.ended', promptInstance)
          promptInstance._emit('prompt.ended', promptInstance)
        } else {
          callInstance._emit('collect.ended', collectInstance)
          collectInstance._emit('collect.ended', collectInstance)
        }
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
