import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKActions,
  SDKWorker,
  VoiceCallConnectAction,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { Call } from '../Call'
import { Voice } from '../Voice'

interface VoiceCallConnectWorkerInitialState {
  controlId: string
  voice: Voice
}

export const voiceCallConnectWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallConnectWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set },
    initialState,
  } = options

  const { voice } = initialState as VoiceCallConnectWorkerInitialState

  function* worker(action: VoiceCallConnectAction) {
    const { payload } = action

    const callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      throw new Error('Missing call instance for connect')
    }
    callInstance.setConnectPayload(payload)
    set<Call>(payload.call_id, callInstance)

    // TODO: The below events seems to be not documented in @RealTimeCallApiEvents. For now, ingoring TS issues

    callInstance.emit('call.state', callInstance)

    switch (payload.connect_state) {
      case 'connecting': {
        // @ts-expect-error
        callInstance.emit('connect.connecting', callInstance)
        return false
      }
      case 'connected': {
        let peerCallInstance = get<Call>(payload.peer.call_id)
        if (!peerCallInstance) {
          peerCallInstance = new Call({
            voice,
            connectPayload: payload,
          })
        } else {
          peerCallInstance.setConnectPayload(payload)
        }
        set<Call>(payload.peer.call_id, peerCallInstance)
        callInstance.peer = peerCallInstance
        peerCallInstance.peer = callInstance
        // @ts-expect-error
        callInstance.emit('connect.connected', peerCallInstance)
        return false
      }
      case 'disconnected': {
        const peerCallInstance = get<Call>(payload.peer.call_id)
        // @ts-expect-error
        callInstance.emit('connect.disconnected')
        callInstance.peer = undefined

        // Add a check because peer call can be removed from the instance map throgh voiceCallStateWorker
        if (peerCallInstance) {
          // @ts-expect-error
          peerCallInstance.emit('connect.disconnected')
          peerCallInstance.peer = undefined
        }
        return true
      }
      case 'failed': {
        callInstance.peer = undefined
        // @ts-expect-error
        callInstance.emit('connect.failed')
        return true
      }
      default:
        // @ts-expect-error
        getLogger().warn(`Unknown connect state: "${payload.connect_state}"`)
        return false
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => action.type === 'calling.call.connect'
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallConnectWorker ended')
}
