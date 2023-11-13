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
import { createClient } from '../createClient'
import type { BaseConnection } from '@signalwire/webrtc'

type WSClientWorkerOnDone = () => void
type WSClientWorkerOnFail = (args: { error: Error }) => void

export type WSClientWorkerHooks = SDKWorkerHooks<
  WSClientWorkerOnDone,
  WSClientWorkerOnFail
>

export const WSClientWorker: SDKWorker<
  ReturnType<typeof createClient<BaseConnection<any>>>,
  WSClientWorkerHooks
> = function* (options): SagaIterator {
  getLogger().debug('WSClientWorker started')
  const { channels, initialState } = options
  const { swEventChannel } = channels
  const { buildInboundCall } = initialState

  while (true) {
    const action: MapToPubSubShape<WebRTCMessageParams> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        getLogger().debug('WSClientWorker action', action)
        if (action.type === 'webrtc.message') {
          return action.payload.method === 'verto.invite'
        }
        return false
      })
    getLogger().debug('Receiving a new call over WebSocket', action)

    // Invoke WSClient function to build and answer the invite
    buildInboundCall(action.payload.params)
  }

  getLogger().trace('WSClientWorker ended')
}
