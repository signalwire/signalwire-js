import {
  getLogger,
  SagaIterator,
  CallingCallPlayEventParams,
} from '@signalwire/core'
import { CallPlayback, createCallPlaybackObject } from '../CallPlayback'
import { Call } from '../Voice'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceCallPlayWorker = function* (
  options: VoiceCallWorkerParams<CallingCallPlayEventParams>
): SagaIterator {
  getLogger().info('voiceCallPlayWorker started')
  const {
    payload,
    instanceMap: { get, set },
  } = options

  const callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    throw new Error('Missing call instance for playback')
  }

  // Playback events control id for prompt contains `.prompt` keyword at the end of the string
  const [controlId] = payload.control_id.split('.')
  getLogger().info('voiceCallPlayWorker controlId', controlId)

  let playbackInstance = get<CallPlayback>(controlId)
  if (!playbackInstance) {
    getLogger().info('voiceCallPlayWorker create instance')
    playbackInstance = createCallPlaybackObject({
      store: callInstance.store,
      // @ts-expect-error
      emitter: callInstance.emitter,
      payload,
    })
  } else {
    getLogger().info('voiceCallPlayWorker GOT instance')
    playbackInstance.setPayload(payload)
  }
  set<CallPlayback>(controlId, playbackInstance)

  switch (payload.state) {
    case 'playing': {
      const type = playbackInstance._paused
        ? 'playback.updated'
        : 'playback.started'
      playbackInstance._paused = false

      callInstance.baseEmitter.emit(type, playbackInstance)
      break
    }
    case 'paused': {
      playbackInstance._paused = true
      callInstance.baseEmitter.emit('playback.updated', playbackInstance)
      break
    }
    case 'error': {
      callInstance.baseEmitter.emit('playback.failed', playbackInstance)

      // To resolve the ended() promise in CallPlayback
      playbackInstance.baseEmitter.emit('playback.failed', playbackInstance)
      break
    }
    case 'finished': {
      callInstance.baseEmitter.emit('playback.ended', playbackInstance)

      // To resolve the ended() promise in CallPlayback
      playbackInstance.baseEmitter.emit('playback.ended', playbackInstance)
      break
    }
    default:
      getLogger().warn(`Unknown playback state: "${payload.state}"`)
      break
  }

  getLogger().info('voiceCallPlayWorker ended')
}
