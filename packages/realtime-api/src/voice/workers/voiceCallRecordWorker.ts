import {
  getLogger,
  SagaIterator,
  SDKChildWorker,
  CallingCallRecordEventParams,
} from '@signalwire/core'
import { CallRecording, createCallRecordingObject } from '../CallRecording'
import { Call } from '../Voice'

export const voiceCallRecordWorker: SDKChildWorker<CallingCallRecordEventParams> =
  function* (options): SagaIterator {
    getLogger().trace('voiceCallRecordWorker started')
    const {
      action: { payload },
      instanceMap: { get, set },
    } = options

    const callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      throw new Error('Missing call instance for recording')
    }

    let recordingInstance = get<CallRecording>(payload.control_id)
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
    set<CallRecording>(payload.control_id, recordingInstance)

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
        getLogger().warn(`Unknown recording state: "${payload.state}"`)
        break
    }

    getLogger().trace('voiceCallRecordWorker ended')
  }
