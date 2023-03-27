import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  CallingCallSDKEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { createCallPromptObject } from '../CallPrompt'

export const voiceSDKCallPromptWorker: SDKCallWorker<CallingCallSDKEventParams> =
  function* (options): SagaIterator {
    getLogger().trace('voiceSDKCallPromptWorker started')
    const {
      payload,
      instanceMap: { get, set },
    } = options

    const callInstance = get(payload.call_id) as Call
    if (!callInstance) {
      throw new Error('Missing call instance for prompt')
    }

    const promptInstance = createCallPromptObject({
      store: callInstance.store,
      // @ts-expect-error
      emitter: callInstance.emitter,
      payload,
    })

    set(payload.control_id, promptInstance)

    callInstance.baseEmitter.emit('prompt.started', promptInstance)

    getLogger().trace('voiceSDKCallPromptWorker ended')
  }
