import {
  getLogger,
  SagaIterator,
  CallingCallCollectEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallPrompt, CallPromptAPI } from '../CallPrompt'
import { CallCollect } from '../CallCollect'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceCallCollectWorker = function* (
  options: VoiceCallWorkerParams<CallingCallCollectEventParams>
): SagaIterator {
  getLogger().trace('voiceCallCollectWorker started')
  const {
    payload,
    instanceMap: { get, set, remove },
  } = options

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
  if (actionInstance instanceof CallPromptAPI) {
    eventPrefix = 'prompt'
  }

  /**
   * Only when partial_results: true
   */
  if (payload.final === false) {
    callInstance.emit(`${eventPrefix}.updated`, actionInstance)
  } else {
    if (payload.result) {
      switch (payload.result.type) {
        case 'start_of_input': {
          // @ts-expect-error
          callInstance.emit(`${eventPrefix}.startOfInput`, actionInstance)
          break
        }
        case 'no_input':
        case 'no_match':
        case 'error': {
          if (payload.state !== 'collecting') {
            callInstance.emit(`${eventPrefix}.failed`, actionInstance)

            // To resolve the ended() promise in CallPrompt or CallCollect
            actionInstance.emit(
              `${eventPrefix}.failed` as never,
              actionInstance
            )

            remove<CallCollect>(payload.control_id)
          }
          break
        }
        case 'speech':
        case 'digit': {
          if (payload.state !== 'collecting') {
            callInstance.emit(`${eventPrefix}.ended`, actionInstance)
            // To resolve the ended() promise in CallPrompt or CallCollect
            actionInstance.emit(`${eventPrefix}.ended` as never, actionInstance)
            remove<CallCollect>(payload.control_id)
          }
          break
        }
        default:
          getLogger().warn(
            // @ts-expect-error
            `Unknown prompt result type: "${payload.result.type}"`
          )
          break
      }
    }
  }

  getLogger().trace('voiceCallCollectWorker ended')
}
