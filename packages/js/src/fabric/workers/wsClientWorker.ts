import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  WebRTCMessageParams,
} from '@signalwire/core'
import { Client } from '../Client'

type WSClientWorkerOnDone = () => void
type WSClientWorkerOnFail = (args: { error: Error }) => void

export type WSClientWorkerHooks = SDKWorkerHooks<
  WSClientWorkerOnDone,
  WSClientWorkerOnFail
>

export const wsClientWorker: SDKWorker<Client, WSClientWorkerHooks> =
  function* (options): SagaIterator {
    getLogger().trace('wsClientWorker started')
    const { channels, initialState } = options
    const { swEventChannel } = channels
    const { buildInboundCall } = initialState

    while (true) {
      const action: MapToPubSubShape<WebRTCMessageParams> =
        yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
          if (action.type === 'webrtc.message') {
            return action.payload.method === 'verto.invite'
          }
          return false
        })
      getLogger().debug('Receiving a new call over WebSocket', action)

      // Invoke WSClient function to build and answer the invite
      buildInboundCall(action.payload.params)
    }

    getLogger().trace('wsClientWorker ended')
  }
