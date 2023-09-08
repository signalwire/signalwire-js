import {
  getLogger,
  SagaIterator,
  SDKWorker,
  sagaEffects,
  VoiceCallPlayAction,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { CallPlaybackListeners } from '../../types'
import { CallPlayback } from '../CallPlayback'
import { Call } from '../Call'
import { SDKActions } from 'packages/core/dist/core/src'

interface VoiceCallPlayWorkerInitialState {
  controlId: string
  listeners?: CallPlaybackListeners
}

export const voiceCallPlayWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallPlayWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set, remove },
    initialState,
  } = options

  const { controlId, listeners } =
    initialState as VoiceCallPlayWorkerInitialState

  /**
   * Playback listeners can be attached to both Call and CallPlayback objects
   * So, we emit the events for both objects
   * Some events are also being used to resolve the promise such as playback.started and playback.failed
   * This worker is also responsible to handle CallPrompt events
   */

  function* worker(action: VoiceCallPlayAction) {
    const { payload } = action

    if (payload.control_id !== controlId) return

    // CallPrompt events contains .prompt at the end of the control id
    const [playbackControlId] = payload.control_id.split('.')

    const removeFromInstanceMap = () => {
      // Do not remove the CallPrompt instance. It will be removed by the @voiceCallCollectWorker
      if (payload.control_id.includes('.prompt')) return
      remove<CallPlayback>(playbackControlId)
    }

    const callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      throw new Error('Missing call instance for playback')
    }

    let playbackInstance = get<CallPlayback>(playbackControlId)
    if (!playbackInstance) {
      playbackInstance = new CallPlayback({
        call: callInstance,
        payload,
        listeners,
      })
    } else {
      playbackInstance.setPayload(payload)
    }
    set<CallPlayback>(playbackControlId, playbackInstance)

    switch (payload.state) {
      case 'playing': {
        const type = playbackInstance._paused
          ? 'playback.updated'
          : 'playback.started'
        playbackInstance._paused = false
        callInstance.emit(type, playbackInstance)
        playbackInstance.emit(type, playbackInstance)
        return false
      }
      case 'paused': {
        playbackInstance._paused = true
        callInstance.emit('playback.updated', playbackInstance)
        playbackInstance.emit('playback.updated', playbackInstance)
        return false
      }
      case 'error': {
        callInstance.emit('playback.failed', playbackInstance)
        playbackInstance.emit('playback.failed', playbackInstance)
        removeFromInstanceMap()
        return true
      }
      case 'finished': {
        callInstance.emit('playback.ended', playbackInstance)
        playbackInstance.emit('playback.ended', playbackInstance)
        removeFromInstanceMap()
        return true
      }
      default:
        getLogger().warn(`Unknown playback state: "${payload.state}"`)
        return false
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => action.type === 'calling.call.play'
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallPlayWorker ended')
}
