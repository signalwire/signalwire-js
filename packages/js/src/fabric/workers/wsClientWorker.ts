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
import { WSClient } from '../WSClient'

type WSClientWorkerOnDone = () => void
type WSClientWorkerOnFail = (args: { error: Error }) => void

export type WSClientWorkerHooks = SDKWorkerHooks<
  WSClientWorkerOnDone,
  WSClientWorkerOnFail
>

export const wsClientWorker: SDKWorker<WSClient, WSClientWorkerHooks> =
  function* (options): SagaIterator {
    getLogger().debug('wsClientWorker started')
    const { channels, initialState } = options
    const { swEventChannel } = channels
    const { handleIncomingInvite } = initialState

    try {
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
        handleIncomingInvite(action.payload.params)
      }
    } finally {
      getLogger().trace('wsClientWorker ended')
    }
  }
