import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKActions,
  SDKWorker,
  VoiceCallConnectAction,
  VoiceCallStateAction,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { Call } from '../Call'
import { Voice } from '../Voice'
import { handleCallStateEvents } from './handlers'

interface VoiceCallConnectWorkerInitialState {
  voice: Voice
  tag: string
}

export const voiceCallConnectWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallConnectWorker started')
  const {
    channels: { swEventChannel },
    instanceMap,
    initialState,
  } = options

  const { voice, tag } = initialState as VoiceCallConnectWorkerInitialState

  function* callConnectWorker(action: VoiceCallConnectAction) {
    const { get, set } = instanceMap
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
        callInstance.emit('connect.failed', payload)
        return true
      }
      default:
        // @ts-expect-error
        getLogger().warn(`Unknown connect state: "${payload.connect_state}"`)
        return false
    }
  }

  function* worker(action: VoiceCallConnectAction | VoiceCallStateAction) {
    if (action.type === 'calling.call.connect') {
      yield sagaEffects.fork(callConnectWorker, action)
      return false
    } else {
      return handleCallStateEvents({
        payload: action.payload,
        voice,
        instanceMap,
      })
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => {
        return (
          action.type === 'calling.call.connect' ||
          (action.type === 'calling.call.state' &&
            action.payload.direction === 'outbound' &&
            action.payload.tag === tag)
        )
      }
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallConnectWorker ended')
}
