import {
  getLogger,
  SagaIterator,
  CallingCallPlayEventParams,
} from '@signalwire/core'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'
import { CallPlayback } from '../CallPlayback2'
import { Call } from '../Call2'

export const voiceCallPlayWorker = function* (
  options: VoiceCallWorkerParams<CallingCallPlayEventParams>
): SagaIterator {
  getLogger().trace('voiceCallPlayWorker started')
  const {
    payload,
    instanceMap: { get, set, remove },
  } = options

  const callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    throw new Error('Missing call instance for playback')
  }

  // Playback events control id for prompt contains `.prompt` keyword at the end of the string
  const [controlId] = payload.control_id.split('.')
  getLogger().trace('voiceCallPlayWorker controlId', controlId)

  let playbackInstance = get<CallPlayback>(controlId)
  if (!playbackInstance) {
    getLogger().trace('voiceCallPlayWorker create instance')
    playbackInstance = new CallPlayback({ call: callInstance, payload })
  } else {
    getLogger().trace('voiceCallPlayWorker GOT instance')
    playbackInstance.setPayload(payload)
  }
  set<CallPlayback>(controlId, playbackInstance)

  /**
   * Playback listeners can be attached to both Call and CallPlayback objects
   * Emit the events for both objects
   * Some events are also being used to resolve the promise such as playback.started and playback.failed
   */

  switch (payload.state) {
    case 'playing': {
      const type = playbackInstance._paused
        ? 'playback.updated'
        : 'playback.started'
      playbackInstance._paused = false

      callInstance.emit(type, playbackInstance)
      playbackInstance.emit(type, playbackInstance)
      break
    }
    case 'paused': {
      playbackInstance._paused = true

      callInstance.emit('playback.updated', playbackInstance)
      playbackInstance.emit('playback.updated', playbackInstance)
      break
    }
    case 'error': {
      callInstance.emit('playback.failed', playbackInstance)
      playbackInstance.emit('playback.failed', playbackInstance)

      remove<CallPlayback>(controlId)
      break
    }
    case 'finished': {
      callInstance.emit('playback.ended', playbackInstance)
      playbackInstance.emit('playback.ended', playbackInstance)

      remove<CallPlayback>(controlId)
      break
    }
    default:
      getLogger().warn(`Unknown playback state: "${payload.state}"`)
      break
  }

  getLogger().trace('voiceCallPlayWorker ended')
}
