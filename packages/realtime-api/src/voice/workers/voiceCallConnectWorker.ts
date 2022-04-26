import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  CallingCallConnectEvent,
  MapToPubSubShape,
  SDKWorkerHooks,
  CallingCallConnectEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'

type VoiceCallConnectWorkerOnDone = (args: {
  params: CallingCallConnectEventParams
}) => void
type VoiceCallConnectWorkerOnFail = (args: {
  params: CallingCallConnectEventParams
}) => void

export type VoiceCallConnectWorkerHooks = SDKWorkerHooks<
  VoiceCallConnectWorkerOnDone,
  VoiceCallConnectWorkerOnFail
>

export const voiceCallConnectWorker: SDKWorker<
  Call,
  VoiceCallConnectWorkerHooks
> = function* (options): SagaIterator {
  getLogger().trace('voiceCallConnectWorker started')
  const { channels, instance, onDone, onFail } = options
  const { swEventChannel, pubSubChannel } = channels

  let run = true
  const done = () => (run = false)

  while (run) {
    const action: MapToPubSubShape<CallingCallConnectEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        return (
          action.type === 'calling.call.connect' &&
          action.payload.tag === instance.tag
        )
      })

    /**
     * Dispatch public events for each connect_state
     */
    yield sagaEffects.put(pubSubChannel, {
      type: `calling.connect.${action.payload.connect_state}`,
      payload: action.payload,
    })

    switch (action.payload.connect_state) {
      case 'connected': {
        /**
         * Update the Call object payload with the new state
         */
        yield sagaEffects.put(pubSubChannel, {
          type: 'calling.call.state',
          payload: {
            call_id: instance.callId,
            call_state: instance.state,
            context: instance.context,
            tag: instance.tag,
            direction: instance.direction,
            device: instance.device,
            node_id: instance.nodeId,
            peer: action.payload.peer,
          },
        })

        onDone?.({ params: action.payload })
        break
      }
      case 'disconnected': {
        done()
        break
      }
      case 'failed': {
        onFail?.({ params: action.payload })
        done()
        break
      }
    }
  }

  getLogger().trace('voiceCallConnectWorker ended')
}
