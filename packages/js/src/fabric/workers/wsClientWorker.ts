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
    const { channels, initialState, instance: client } = options
    const { swEventChannel } = channels
    const { handleIncomingInvite } = initialState

    function* fireHoseWorker(action: SDKActions) {
      // @ts-expect-error Emit all events - This is for internal usage
      client.emit(action.type, action.payload)
    }

    function* vertoInviteWorker(action: MapToPubSubShape<WebRTCMessageParams>) {
      // Invoke WSClient function to build and answer the invite
      handleIncomingInvite(action.payload.params)
    }

    const isVertoInvite = (action: SDKActions) => {
      if (action.type === 'webrtc.message') {
        return action.payload.method === 'verto.invite'
      }
      return false
    }

    try {
      while (true) {
        // Take all actions from the channel
        const action: SDKActions = yield sagaEffects.take(
          swEventChannel,
          () => true
        )

        // Fire all the events with fireHoseWorker
        yield sagaEffects.fork(fireHoseWorker, action)

        // If the event is verto.invite, handle that with vertoInviteWorker
        if (isVertoInvite(action)) {
          getLogger().debug('Receiving a call over WebSocket', action)
          yield sagaEffects.fork(
            vertoInviteWorker,
            action as MapToPubSubShape<WebRTCMessageParams>
          )
        }
      }
    } finally {
      getLogger().trace('wsClientWorker ended')
    }
  }
