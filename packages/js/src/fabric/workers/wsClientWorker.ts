import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  SDKWorkerHooks,
  WebRTCMessageParams,
  SwAuthorizationStateEvent,
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

    function* authStateWorker(
      action: MapToPubSubShape<SwAuthorizationStateEvent>
    ) {
      client.authState = action.payload.authorization_state
      client.emit('authorization.state', action.payload)
    }

    const isVertoInvite = (action: SDKActions) => {
      if (
        action.type === 'webrtc.message' &&
        action.payload.method === 'verto.invite'
      ) {
        return action.payload.method === 'verto.invite'
      }
      return false
    }

    const isAuthState = (action: SDKActions) => {
      return action.type === 'signalwire.authorization.state'
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

        // If the event is signalwire.authorization.state, handle that with authStateWorker
        if (isAuthState(action)) {
          getLogger().debug('An authorization state is received', action)
          yield sagaEffects.fork(authStateWorker, action)
        }

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
