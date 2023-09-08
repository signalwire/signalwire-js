import {
  getLogger,
  SagaIterator,
  SDKWorker,
  sagaEffects,
  SDKActions,
  VoiceCallRecordAction,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { CallRecordingListeners } from '../../types'
import { Call } from '../Call'
import { CallRecording } from '../CallRecording'

interface VoiceCallRecordWorkerInitialState {
  controlId: string
  listeners?: CallRecordingListeners
}

export const voiceCallRecordWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallRecordWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set, remove },
    initialState,
  } = options

  const { controlId, listeners } =
    initialState as VoiceCallRecordWorkerInitialState

  function* worker(action: VoiceCallRecordAction) {
    const { payload } = action

    if (payload.control_id !== controlId) return

    const callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      throw new Error('Missing call instance for recording')
    }

    let recordingInstance = get<CallRecording>(payload.control_id)
    if (!recordingInstance) {
      recordingInstance = new CallRecording({
        call: callInstance,
        payload,
        listeners,
      })
    } else {
      recordingInstance.setPayload(payload)
    }
    set<CallRecording>(payload.control_id, recordingInstance)

    switch (payload.state) {
      case 'recording': {
        const type = recordingInstance._paused
          ? 'recording.updated'
          : 'recording.started'
        recordingInstance._paused = false

        callInstance.emit(type, recordingInstance)
        recordingInstance.emit(type, recordingInstance)
        return false
      }
      case 'paused': {
        recordingInstance._paused = true
        callInstance.emit('recording.updated', recordingInstance)
        recordingInstance.emit('recording.updated', recordingInstance)
        return false
      }
      case 'no_input':
      case 'finished': {
        const type =
          payload.state === 'finished' ? 'recording.ended' : 'recording.failed'
        callInstance.emit(type, recordingInstance)
        recordingInstance.emit(type, recordingInstance)

        remove<CallRecording>(payload.control_id)
        return true
      }
      default:
        getLogger().warn(`Unknown recording state: "${payload.state}"`)
        return false
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => action.type === 'calling.call.record'
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallRecordWorker ended')
}
