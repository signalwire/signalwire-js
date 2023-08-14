import {
  getLogger,
  SagaIterator,
  sagaEffects,
  VoiceCallStateAction,
  SDKWorker,
} from '@signalwire/core'
import { Call } from '../Call2'
import type { Client } from '../../client/index'
import { SDKActions } from 'packages/core/dist/core/src'
import { Voice } from '../Voice2'
import { RealTimeCallListeners } from '../../types'

/**
 * This worker runs for both Inbound and Outbound calls.
 * Only an Outbound call has a "tag".
 * Only an Outbound call can have "listeners".
 */

export const voiceCallStateWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallStateWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set, remove },
    initialState,
  } = options

  const { voice, tag, listeners, direction } = initialState as {
    voice: Voice
    direction: 'inbound' | 'outbound'
    tag?: string
    listeners?: RealTimeCallListeners
  }

  function* worker(action: VoiceCallStateAction) {
    const { payload } = action

    let callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      callInstance = new Call({
        voice,
        payload,
        listeners: tag ? listeners : undefined,
      })
    } else {
      callInstance.setPayload(payload)
    }
    set<Call>(payload.call_id, callInstance)

    switch (payload.call_state) {
      case 'ended': {
        callInstance.emit('call.state', callInstance)

        // Resolves the promise when user disconnects using a peer call instance
        // @ts-expect-error
        callInstance.emit('connect.disconnected', callInstance)
        remove<Call>(payload.call_id)

        return true
      }
      default:
        callInstance.emit('call.state', callInstance)
        return false
    }
  }

  while (true) {
    /**
     * The outbound call should be created by the outbound worker and pass the listeners
     * To avoid call being created by the inbound worker; add direction condition here
     */
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) =>
        action.type === 'calling.call.state' &&
        action.payload.direction === direction
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().debug('voiceCallStateWorker ended', direction)
}
