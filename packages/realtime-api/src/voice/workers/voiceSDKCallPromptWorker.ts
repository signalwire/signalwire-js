import {
  getLogger,
  SagaIterator,
  CallingCallSDKEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallPrompt, createCallPromptObject } from '../CallPrompt'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceSDKCallPromptWorker = function* (
  options: VoiceCallWorkerParams<CallingCallSDKEventParams>
): SagaIterator {
  getLogger().trace('voiceSDKCallPromptWorker started')
  const {
    payload,
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
