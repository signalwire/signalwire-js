import {
  getLogger,
  SagaIterator,
  SDKChildWorker,
  CallingCallSDKEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallPrompt, createCallPromptObject } from '../CallPrompt'

export const voiceSDKCallPromptWorker: SDKChildWorker<CallingCallSDKEventParams> =
  function* (options): SagaIterator {
    getLogger().trace('voiceSDKCallPromptWorker started')
    const {
      action: { payload },
      instanceMap: { get, set },
    } = options

    const callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      throw new Error('Missing call instance for prompt')
    }

    const promptInstance = createCallPromptObject({
      store: callInstance.store,
      // @ts-expect-error
      emitter: callInstance.emitter,
      payload,
    })

    set<CallPrompt>(payload.control_id, promptInstance)

    callInstance.baseEmitter.emit('prompt.started', promptInstance)

    getLogger().trace('voiceSDKCallPromptWorker ended')
  }
