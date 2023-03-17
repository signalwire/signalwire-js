import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  CallingCallRecordEventParams,
} from '@signalwire/core'
import { CallRecording, createCallRecordingObject } from '../CallRecording'
import { Call } from '../Voice'

export const voiceCallRecordWorker: SDKCallWorker<CallingCallRecordEventParams> =
  function* (options): SagaIterator {
    getLogger().trace('voiceCallRecordWorker started')
    const { payload, instanceMap } = options

    const callInstance = instanceMap.get(payload.call_id) as Call
    if (!callInstance) {
      throw new Error('Missing call instance for recording')
    }

    let recordingInstance = instanceMap.get(payload.control_id) as CallRecording
    if (!recordingInstance) {
      recordingInstance = createCallRecordingObject({
        store: callInstance.store,
        // @ts-expect-error
        emitter: callInstance.emitter,
        payload,
      })
    } else {
      recordingInstance.setPayload(payload)
    }
    instanceMap.set(payload.control_id, recordingInstance)

    switch (payload.state) {
      case 'recording': {
        callInstance.baseEmitter.emit('recording.started', recordingInstance)
        break
      }
      case 'no_input':
      case 'finished': {
        const type =
          payload.state === 'finished' ? 'recording.ended' : 'recording.failed'
        callInstance.baseEmitter.emit(type, recordingInstance)

        // To resolve the ended() promise in CallRecording
        recordingInstance.baseEmitter.emit(type, recordingInstance)
        break
      }
      default:
        break
    }

    getLogger().trace('voiceCallRecordWorker ended')
  }
